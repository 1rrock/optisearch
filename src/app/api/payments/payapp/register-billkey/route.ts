import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { createServerClient } from "@/shared/lib/supabase";
import { registerBillKey } from "@/shared/lib/payapp";
import { PLAN_PRICING, UPGRADE_DIFF } from "@/shared/config/constants";
import type { PlanId } from "@/shared/config/constants";
import { getKstDateString } from "@/shared/lib/payapp-time";
import {
  calcProRatedDiff,
  isGracePeriodEligible,
} from "@/shared/lib/subscription-upgrade-rules";

/**
 * POST /api/payments/payapp/register-billkey
 * Body: { plan: "basic" | "pro", phone: string }
 *
 * 신규 구독: billRegist 완료 후 webhook에서 즉시 first_charge billPay 시도
 * 동일 플랜 grace 재구독: current_period_end 이후 첫 청구
 * grace 기간 basic → pro: billRegist 후 webhook에서 upgrade_diff 즉시 청구
 */
export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: { plan?: string; phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { plan, phone } = body;

  if (plan !== "basic" && plan !== "pro") {
    return NextResponse.json({ error: "유효하지 않은 플랜입니다." }, { status: 400 });
  }
  if (!phone || typeof phone !== "string" || !/^010\d{8}$/.test(phone)) {
    return NextResponse.json({ error: "유효하지 않은 휴대폰번호입니다." }, { status: 400 });
  }

  const supabase = await createServerClient();
  const todayKST = getKstDateString();

  // 1. active/pending_billing 중복 체크
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id, status, plan")
    .eq("user_id", user.userId)
    .in("status", ["active", "pending_billing"])
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "이미 활성화된 구독이 있습니다." }, { status: 409 });
  }

  // 2. grace 행 조회 → deferred same-plan 재구독 / basic→pro diff upgrade 판별
  const { data: graceSub } = await supabase
    .from("subscriptions")
    .select("id, status, current_period_end, plan")
    .eq("user_id", user.userId)
    .in("status", ["pending_cancel", "stopped"])
    .order("status", { ascending: true })
    .limit(1)
    .maybeSingle();

  const hasGracePeriod = isGracePeriodEligible(
    graceSub?.status,
    graceSub?.current_period_end,
    todayKST
  );

  const { data: latestSub } = graceSub
    ? { data: null }
    : await supabase
        .from("subscriptions")
        .select("id, status")
        .eq("user_id", user.userId)
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle();

  const targetSubscription = graceSub ?? latestSub;

  const nextBillingDate = hasGracePeriod
    ? graceSub?.current_period_end ?? todayKST
    : todayKST;

  const isDiffUpgrade =
    hasGracePeriod &&
    graceSub?.plan === "basic" &&
    plan === "pro";
  const upsertPlan: PlanId = isDiffUpgrade ? "basic" : plan;
  const proRatedAmount = isDiffUpgrade
    ? calcProRatedDiff(UPGRADE_DIFF.basicToPro, nextBillingDate)
    : 0;

  // 4. DB에 pending_billing + next_billing_date 사전 저장
  const upsertPayload = {
    user_id: user.userId,
    status: "pending_billing" as const,
    plan: upsertPlan,
    next_billing_date: nextBillingDate,
    pending_action: isDiffUpgrade ? "upgrade" : null,
    pending_plan: isDiffUpgrade ? ("pro" as PlanId) : null,
    pending_start_date: isDiffUpgrade ? nextBillingDate : null,
    bill_key: null as string | null,
    failed_charge_count: 0,
    rebill_no: null as string | null,
  };

  const subscriptionMutation = targetSubscription?.id
    ? await supabase
        .from("subscriptions")
        .update(upsertPayload)
        .eq("id", targetSubscription.id)
    : await supabase
        .from("subscriptions")
        .insert(upsertPayload);

  if (subscriptionMutation.error) {
    console.error("[register-billkey] DB write error:", subscriptionMutation.error.message);
    return NextResponse.json({ error: "구독 준비 중 오류가 발생했습니다." }, { status: 500 });
  }

  // 5. PayApp billRegist 호출
  const origin =
    request.headers.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "";

  const planLabel = plan === "pro" ? "프로" : "베이직";
  const result = await registerBillKey({
    goodname: `옵티서치 ${planLabel} 카드 등록`,
    recvphone: phone,
    var1: `${user.userId}:${plan}`,
    var2: "billkey_registration",
    openpaytype: "card",
    smsuse: "n",
    feedbackurl: process.env.PAYAPP_FEEDBACK_URL,
    returnurl: `${origin}/settings?from=payment&billing=billkey`,
  });

  if (result.state !== 1 || !result.payurl) {
    // rollback: pending_billing → stopped (또는 삭제)
    const rollbackStatus = targetSubscription?.status ?? "stopped";
    const rollbackPayload = {
      status: rollbackStatus,
      next_billing_date: null,
      pending_action: null,
      pending_plan: null,
      pending_start_date: null,
      bill_key: null,
    };

    if (targetSubscription?.id) {
      await supabase
        .from("subscriptions")
        .update(rollbackPayload)
        .eq("id", targetSubscription.id)
        .eq("status", "pending_billing");
    } else {
      await supabase
        .from("subscriptions")
        .update(rollbackPayload)
        .eq("user_id", user.userId)
        .eq("status", "pending_billing");
    }

    return NextResponse.json(
      { error: result.errorMessage ?? "카드 등록 요청에 실패했습니다." },
      { status: 502 }
    );
  }

  console.log("[register-billkey] billRegist ok:", {
    userId: user.userId,
    plan,
    nextBillingDate,
    isDiffUpgrade,
    upsertPlan,
    proRatedAmount,
    pricing: PLAN_PRICING[plan as PlanId].monthly,
  });

  return NextResponse.json({
    ok: true,
    payurl: result.payurl,
    nextBillingDate,
    isDiffUpgrade,
    proRatedAmount,
  });
}
