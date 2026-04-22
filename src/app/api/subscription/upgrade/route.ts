import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { createServerClient } from "@/shared/lib/supabase";
import { billPay, isPayAppTimeoutError } from "@/shared/lib/payapp";
import { UPGRADE_DIFF } from "@/shared/config/constants";
import {
  buildPaymentAttemptKey,
  resolveAttemptFailureStatus,
} from "@/shared/lib/payapp-launch-rules";

/** 남은 기간 비례 업그레이드 차액 계산 (KST, 30일 기준, 올림) */
function calcProRatedDiff(fullDiff: number, nextBillingDate: string | null): number {
  if (!nextBillingDate) return fullDiff;
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const todayKST = new Date(Date.now() + KST_OFFSET_MS);
  const nextDate = new Date(nextBillingDate + "T00:00:00+09:00");
  const remainingMs = nextDate.getTime() - todayKST.getTime();
  const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
  if (remainingDays === 0) return 0;
  const proRated = Math.ceil((fullDiff * remainingDays) / 30);
  return proRated;
}

/**
 * GET /api/subscription/upgrade
 * basic 플랜 유저의 pro 업그레이드 예상 금액 미리보기
 */
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user || user.plan !== "basic") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const supabase = await createServerClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("next_billing_date, current_period_end")
    .eq("user_id", user.userId)
    .eq("status", "active")
    .maybeSingle();

  const amount = calcProRatedDiff(UPGRADE_DIFF.basicToPro, sub?.next_billing_date ?? null);
  const nextBillingDate = sub?.next_billing_date ?? null;

  return NextResponse.json({ previewAmount: amount, nextBillingDate });
}

/**
 * POST /api/subscription/upgrade
 * basic → pro 업그레이드 차액결제
 *
 * 분기 A: bill_key 존재 → billPay로 즉시 차액 청구 (서버 주도)
 * 분기 B: rebill_no만 있음 → createOneOffPayment로 payurl 반환 (클라이언트 리다이렉트)
 * 분기 C: 둘 다 없음 → 500 (데이터 이상)
 *
 * 결제 성공 후 plan=pro 전환은 webhook(var2=upgrade_diff, pay_state=4) 브랜치에서 처리됨.
 */
export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (user.plan !== "basic") {
    return NextResponse.json(
      { error: "basic 플랜 사용자만 pro로 업그레이드할 수 있습니다." },
      { status: 400 }
    );
  }

  try {
    const supabase = await createServerClient();

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id, status, bill_key, rebill_no, pending_action, current_period_end, next_billing_date")
      .eq("user_id", user.userId)
      .maybeSingle();

    if (sub?.status !== "active") {
      return NextResponse.json(
        { error: "활성 구독이 없습니다." },
        { status: 400 }
      );
    }

    if (sub?.pending_action != null) {
      return NextResponse.json(
        { error: "이미 예약된 변경이 있습니다." },
        { status: 409 }
      );
    }

    const recvphone = process.env.PAYAPP_DEFAULT_RECVPHONE ?? "01000000000";
    const feedbackurl = process.env.PAYAPP_FEEDBACK_URL;

    // ── 분기 A: bill_key 존재 → 즉시 차액 청구 ──
    if (sub?.bill_key) {
      const amount = calcProRatedDiff(UPGRADE_DIFF.basicToPro, sub.next_billing_date);

      // 결제일이 오늘: 차액 0 → 실제 결제 없이 plan 업그레이드 (다음 Cron이 pro 가격으로 청구)
      if (amount === 0) {
        await supabase
          .from("subscriptions")
          .update({ plan: "pro" })
          .eq("id", sub.id)
          .eq("status", "active");
        return NextResponse.json({ ok: true, method: "free_upgrade", proRatedAmount: 0 });
      }

      const nowIso = new Date().toISOString();
      const attemptKey = buildPaymentAttemptKey("upgrade_diff", sub.id, nowIso);
      await supabase.from("payment_attempts").insert({
        attempt_key: attemptKey,
        user_id: user.userId,
        subscription_id: sub.id,
        attempt_kind: "upgrade_diff",
        status: "pending",
        amount,
        provider_request_payload: { plan: "pro", amount },
      });

      try {
        const result = await billPay({
          billKey: sub.bill_key,
          goodname: "옵티서치 pro 업그레이드 차액",
          price: amount,
          recvphone,
          var1: `${user.userId}:pro`,
          var2: "upgrade_diff",
          feedbackurl,
        });

        await supabase.from("payment_attempts").update({
          status: result.state === 1 ? "dispatched" : "failed",
          mul_no: result.mulNo ?? null,
          provider_response_payload: result.raw,
          manual_review_reason: result.state === 1 ? null : result.errorMessage ?? "upgrade billPay failed",
          resolved_at: result.state === 1 ? null : nowIso,
        }).eq("attempt_key", attemptKey);

        if (result.state === 1) {
          return NextResponse.json({
            ok: true,
            method: "billpay_instant",
            mulNo: result.mulNo,
            proRatedAmount: amount,
          });
        }

        return NextResponse.json(
          { error: result.errorMessage ?? "결제에 실패했습니다." },
          { status: 502 }
        );
      } catch (error) {
        await supabase.from("payment_attempts").update({
          status: resolveAttemptFailureStatus(error),
          provider_response_payload: { error: error instanceof Error ? error.message : String(error) },
          manual_review_reason: error instanceof Error ? error.message : String(error),
          resolved_at: new Date().toISOString(),
        }).eq("attempt_key", attemptKey);

        if (isPayAppTimeoutError(error)) {
          return NextResponse.json(
            { error: "결제 상태 확인이 필요합니다. 중복 결제를 막기 위해 자동 재시도는 중단되었으며 고객센터에서 확인 후 안내드립니다." },
            { status: 409 }
          );
        }

        throw error;
      }
    }

    // ── 분기 B: rebill_no만 있음 (레거시) → 안전한 상용 전환 전까지 셀프서비스 차단 ──
    if (sub?.rebill_no) {
      return NextResponse.json(
        { error: "레거시 결제 사용자 업그레이드는 고객센터에서 확인 후 처리됩니다." },
        { status: 409 }
      );
    }

    // ── 분기 C: 결제 수단 없음 ──
    console.error("[upgrade] subscription has neither bill_key nor rebill_no:", sub?.id);
    return NextResponse.json(
      { error: "결제 수단 정보가 없습니다. 고객센터에 문의해 주세요." },
      { status: 500 }
    );
  } catch (err) {
    if (isPayAppTimeoutError(err)) {
      return NextResponse.json(
        { error: "결제 상태 확인이 필요합니다. 중복 결제를 막기 위해 자동 재시도는 중단되었으며 고객센터에서 확인 후 안내드립니다." },
        { status: 409 }
      );
    }
    console.error("[upgrade] Fatal error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
