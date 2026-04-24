import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { createServerClient } from "@/shared/lib/supabase";
import { registerRebill, defaultRebillExpire } from "@/shared/lib/payapp";
import { PLAN_PRICING, type PlanId } from "@/shared/config/constants";

/**
 * POST /api/payments/payapp/create-rebill
 * Body: { plan: "basic" | "pro", phone: string }
 *
 * 정기결제 등록 (rebillRegist). payurl 반환 → 클라이언트가 redirect.
 * 첫 결제는 PayApp 페이지에서 카드 입력 시 즉시 발생, 이후 매월 자동청구.
 * 업그레이드/해지는 rebillCancel + 새 rebillRegist 패턴을 사용.
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

  const plan = body.plan;
  const phone = body.phone;

  if (plan !== "basic" && plan !== "pro") {
    return NextResponse.json({ error: "유효하지 않은 플랜입니다." }, { status: 400 });
  }
  if (!phone || typeof phone !== "string" || !/^010\d{8}$/.test(phone)) {
    return NextResponse.json({ error: "유효하지 않은 휴대폰번호입니다." }, { status: 400 });
  }

  const supabase = await createServerClient();

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id, status")
    .eq("user_id", user.userId)
    .in("status", ["active", "pending_billing"])
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "이미 활성 구독이 있습니다. 먼저 해지한 뒤 다시 시도해주세요." },
      { status: 409 }
    );
  }

  const pricing = PLAN_PRICING[plan as PlanId];
  const planLabel = plan === "pro" ? "프로" : "베이직";

  const origin =
    request.headers.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "";

  const result = await registerRebill({
    goodname: `옵티서치 ${planLabel}`,
    goodprice: pricing.monthly,
    recvphone: phone,
    rebillCycleType: "Month",
    rebillExpire: defaultRebillExpire(4),
    var1: `${user.userId}:${plan}`,
    var2: "rebill_registration",
    openpaytype: "card",
    smsuse: "n",
    feedbackurl: process.env.PAYAPP_FEEDBACK_URL,
    returnurl: `${origin}/settings?from=payment`,
  });

  if (result.state !== 1 || !result.payurl || !result.rebillNo) {
    console.error("[create-rebill] rebillRegist failed:", result.errorMessage);
    return NextResponse.json(
      { error: result.errorMessage ?? "정기결제 등록에 실패했습니다." },
      { status: 502 }
    );
  }

  const { error: insertError } = await supabase.from("subscriptions").insert({
    user_id: user.userId,
    plan,
    status: "pending_billing",
    rebill_no: result.rebillNo,
  });

  if (insertError) {
    console.error("[create-rebill] DB insert failed:", insertError.message);
    return NextResponse.json(
      { error: "구독 정보 저장에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    payurl: result.payurl,
    rebillNo: result.rebillNo,
  });
}
