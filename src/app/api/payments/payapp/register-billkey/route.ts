import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { createServerClient } from "@/shared/lib/supabase";
import { registerBillKey } from "@/shared/lib/payapp";
import { PLAN_PRICING } from "@/shared/config/constants";
import type { PlanId } from "@/shared/config/constants";
import { getKstDateString } from "@/shared/lib/payapp-time";

/**
 * POST /api/payments/payapp/register-billkey
 * Body: { plan: "basic" | "pro", phone: string }
 *
 * 신규 구독: billRegist 완료 후 webhook에서 즉시 first_charge billPay 시도
 * 재구독(stopped + grace period): current_period_end 이후 첫 청구
 * stopped basic → pro with grace period: 안전한 상용 정책 확정 전까지 셀프서비스 차단
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

  // 2. stopped 행 조회 → grace period 및 next_billing_date 결정
  const { data: stoppedSub } = await supabase
    .from("subscriptions")
    .select("id, status, current_period_end, plan")
    .eq("user_id", user.userId)
    .eq("status", "stopped")
    .maybeSingle();

  const hasGracePeriod =
    !!stoppedSub?.current_period_end &&
    stoppedSub.current_period_end > todayKST;

  const nextBillingDate = hasGracePeriod
    ? stoppedSub!.current_period_end
    : todayKST;

  // 3. stopped basic → pro with grace period는 기존 차액 경로가 상용 안전하지 않으므로 차단
  const isDiffUpgrade =
    hasGracePeriod &&
    stoppedSub!.plan === "basic" &&
    plan === "pro";

  if (isDiffUpgrade) {
    return NextResponse.json(
      {
        error:
          "현재 이용기간이 남아 있는 베이직→프로 재구독은 셀프 전환이 일시 중단되었습니다. 고객센터로 문의해 주세요.",
      },
      { status: 409 }
    );
  }

  // 4. DB에 pending_billing + next_billing_date 사전 저장
  const upsertPayload = {
    user_id: user.userId,
    status: "pending_billing" as const,
    plan: plan as PlanId,
    next_billing_date: nextBillingDate,
    bill_key: null as string | null,
    failed_charge_count: 0,
    rebill_no: null as string | null,
    pending_billing_started_at: new Date().toISOString(),
    bill_key_registered_at: null as string | null,
    last_manual_review_at: null as string | null,
    last_manual_review_reason: null as string | null,
    legacy_billing_model: "bill_key" as const,
  };

  const { error: upsertError } = await supabase
    .from("subscriptions")
    .upsert(upsertPayload, { onConflict: "user_id" });

  if (upsertError) {
    console.error("[register-billkey] DB upsert error:", upsertError.message);
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
    await supabase
      .from("subscriptions")
      .update({ status: "stopped", next_billing_date: null, bill_key: null })
      .eq("user_id", user.userId)
      .eq("status", "pending_billing");

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
    pricing: PLAN_PRICING[plan as PlanId].monthly,
  });

  return NextResponse.json({
    ok: true,
    payurl: result.payurl,
    nextBillingDate,
    isDiffUpgrade: false,
    proRatedAmount: 0,
  });
}
