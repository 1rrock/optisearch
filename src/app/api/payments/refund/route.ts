import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { createServerClient } from "@/shared/lib/supabase";
import { cancelPayment, cancelRebill } from "@/shared/lib/payapp";
import { REFUND_POLICY } from "@/shared/config/constants";

/**
 * POST /api/payments/refund
 * Body: { mulNo }
 *
 * 셀프 환불 조건:
 * - 결제 후 REFUND_POLICY.maxDaysSincePayment 일 이내
 * - 키워드 검색 ≤ REFUND_POLICY.maxKeywordSearches
 * - AI 기능 사용 ≤ REFUND_POLICY.maxAiUsage
 * - 첫 정기구독 결제 건에 한함
 */

type RefundablePaymentRow = {
  id: string;
  user_id: string;
  mul_no: string;
  amount: number;
  paid_at: string | null;
  provider_paid_at: string | null;
  purpose: string | null;
  refunded_at: string | null;
};

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: { mulNo?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const mulNo = typeof body.mulNo === "string" ? body.mulNo.trim() : null;
  if (!mulNo) {
    return NextResponse.json({ error: "mulNo가 필요합니다." }, { status: 400 });
  }

  try {
    const supabase = await createServerClient();

    const { data: payment, error: paymentError } = await supabase
      .from("payment_history")
      .select("id, user_id, mul_no, amount, paid_at, provider_paid_at, purpose, refunded_at")
      .eq("mul_no", mulNo)
      .maybeSingle();

    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 500 });
    }

    const paymentRow = payment as RefundablePaymentRow | null;
    if (!paymentRow) {
      return NextResponse.json({ error: "해당 결제 내역을 찾을 수 없습니다." }, { status: 404 });
    }
    if (paymentRow.user_id !== user.userId) {
      return NextResponse.json({ error: "이 결제에 대한 권한이 없습니다." }, { status: 403 });
    }
    if (paymentRow.refunded_at) {
      return NextResponse.json({ error: "이미 환불 처리된 결제입니다." }, { status: 400 });
    }
    if (paymentRow.purpose !== "subscription") {
      return NextResponse.json(
        { error: "첫 정기구독 결제 건만 셀프 환불할 수 있습니다." },
        { status: 400 }
      );
    }

    // 첫 정기구독 결제인지 확인
    const { data: subscriptionPayments, error: firstPaymentError } = await supabase
      .from("payment_history")
      .select("mul_no, provider_paid_at, paid_at")
      .eq("user_id", user.userId)
      .eq("purpose", "subscription")
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: true })
      .limit(1);

    if (firstPaymentError) {
      return NextResponse.json({ error: firstPaymentError.message }, { status: 500 });
    }

    const firstMulNo = subscriptionPayments?.[0]?.mul_no ?? null;
    if (firstMulNo !== mulNo) {
      return NextResponse.json(
        { error: "첫 정기구독 결제 건만 셀프 환불이 가능합니다." },
        { status: 400 }
      );
    }

    const paidAtIso = paymentRow.provider_paid_at ?? paymentRow.paid_at;
    if (!paidAtIso) {
      return NextResponse.json({ error: "결제 일시 정보가 없습니다." }, { status: 400 });
    }
    const daysSincePayment =
      (Date.now() - new Date(paidAtIso).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSincePayment > REFUND_POLICY.maxDaysSincePayment) {
      return NextResponse.json(
        { error: `결제일로부터 ${REFUND_POLICY.maxDaysSincePayment}일이 경과하여 환불이 불가합니다.` },
        { status: 400 }
      );
    }

    const { count: aiCount, error: aiError } = await supabase
      .from("ai_usage")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.userId)
      .in("feature", ["analyze", "draft"]);

    if (aiError) {
      return NextResponse.json({ error: aiError.message }, { status: 500 });
    }
    if ((aiCount ?? 0) > REFUND_POLICY.maxAiUsage) {
      return NextResponse.json({ error: "AI 기능 사용 이력이 있어 환불이 불가합니다." }, { status: 400 });
    }

    const { count: searchCount, error: searchError } = await supabase
      .from("ai_usage")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.userId)
      .eq("feature", "search");

    if (searchError) {
      return NextResponse.json({ error: searchError.message }, { status: 500 });
    }
    if ((searchCount ?? 0) > REFUND_POLICY.maxKeywordSearches) {
      return NextResponse.json(
        { error: `키워드 검색을 ${REFUND_POLICY.maxKeywordSearches}회 초과하여 환불이 불가합니다.` },
        { status: 400 }
      );
    }

    const cancelResult = await cancelPayment({
      mulNo,
      memo: "7일 이내 첫 정기구독 결제 환불",
    });
    if (cancelResult.state !== 1) {
      return NextResponse.json(
        { error: "결제 취소에 실패했습니다. 고객센터에 문의해주세요.", detail: cancelResult.errorMessage },
        { status: 502 }
      );
    }

    const nowIso = new Date().toISOString();
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("id, rebill_no")
      .eq("user_id", user.userId)
      .maybeSingle();

    // rebill best-effort 취소
    if (subscription?.rebill_no) {
      try {
        await cancelRebill(subscription.rebill_no);
      } catch (err) {
        console.warn("[refund] rebillCancel best-effort failed:", err);
      }
    }

    await supabase
      .from("payment_history")
      .update({ refunded_at: nowIso })
      .eq("mul_no", mulNo);

    if (subscription) {
      await supabase
        .from("subscriptions")
        .update({
          status: "stopped",
          stopped_reason: "refunded",
          canceled_at: nowIso,
        })
        .eq("id", subscription.id);
    }

    return NextResponse.json({
      ok: true,
      refundedAmount: paymentRow.amount,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
