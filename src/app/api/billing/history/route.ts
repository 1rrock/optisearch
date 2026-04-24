import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { createServerClient } from "@/shared/lib/supabase";
import { REFUND_POLICY } from "@/shared/config/constants";
import { isPaymentHistoryColumnMissingError } from "@/shared/lib/payment-history-compat";
import { pickFirstSubscriptionPaymentMulNo, type SubscriptionPaymentLike } from "@/shared/lib/payapp-launch-rules";

export interface PaymentHistoryItem {
  id: string;
  mulNo: string;
  amount: number;
  vat: number;
  purpose: string;
  paidAt: string;
  refundedAt: string | null;
  receiptUrl: string | null;
  providerPaidAt: string | null;
  /** 환불 가능 여부 (클라이언트 UI 조건만 — 사용량은 서버에서 최종 검증) */
  canRefund: boolean;
  /** 환불 불가 사유 (canRefund=false일 때) */
  refundBlockReason: string | null;
}

type PaymentHistoryRow = {
  id: string;
  mul_no: string;
  amount: number;
  vat: number | null;
  purpose: string | null;
  paid_at: string;
  provider_paid_at: string | null;
  refunded_at: string | null;
  receipt_url: string | null;
};

/**
 * GET /api/billing/history
 * 최근 12개월 결제 내역 조회 (최신순)
 */
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const supabase = await createServerClient();

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    let payments: PaymentHistoryRow[] = [];
    let payError: { message: string } | null = null;

    const enhanced = await supabase
      .from("payment_history")
      .select("id, mul_no, amount, vat, purpose, paid_at, provider_paid_at, refunded_at, receipt_url")
      .eq("user_id", user.userId)
      .gte("paid_at", twelveMonthsAgo.toISOString())
      .order("paid_at", { ascending: false })
      .limit(100);

    payments = (enhanced.data ?? []) as unknown as PaymentHistoryRow[];
    payError = enhanced.error;

    if (payError && isPaymentHistoryColumnMissingError(payError, ["provider_paid_at"])) {
      const fallback = await supabase
        .from("payment_history")
        .select("id, mul_no, amount, vat, purpose, paid_at, refunded_at, receipt_url")
        .eq("user_id", user.userId)
        .gte("paid_at", twelveMonthsAgo.toISOString())
        .order("paid_at", { ascending: false })
        .limit(100);

      payments = ((fallback.data ?? []) as unknown as Array<Omit<PaymentHistoryRow, "provider_paid_at">>).map((payment) => ({
        ...payment,
        provider_paid_at: null,
      }));
      payError = fallback.error;
    }

    if (payError) {
      console.error("[billing/history] DB error:", payError.message);
      return NextResponse.json({ error: "결제 내역 조회에 실패했습니다." }, { status: 500 });
    }

    const now = Date.now();
    const firstSubscriptionMulNo = pickFirstSubscriptionPaymentMulNo(
      payments.map((payment): SubscriptionPaymentLike => ({
        mul_no: payment.mul_no,
        purpose: payment.purpose,
        provider_paid_at: payment.provider_paid_at ?? null,
        paid_at: payment.paid_at,
      }))
    );

    const items: PaymentHistoryItem[] = payments.map((p) => {
      // 환불 가능 여부 판단 (UI 조건만 — 사용량은 /api/payments/refund에서 최종 검증)
      let canRefund = false;
      let refundBlockReason: string | null = null;

      if (p.refunded_at) {
        refundBlockReason = "이미 환불 처리된 결제입니다.";
      } else if (p.purpose !== "subscription") {
        refundBlockReason = "첫 정기구독 결제 건만 셀프 환불이 가능합니다.";
      } else if (firstSubscriptionMulNo !== p.mul_no) {
        refundBlockReason = "첫 정기구독 결제 건만 셀프 환불이 가능합니다.";
      } else if (!p.paid_at) {
        refundBlockReason = "결제 일시 정보가 없습니다.";
      } else {
        const paidAt = p.provider_paid_at ?? p.paid_at;
        const daysSince = (now - new Date(paidAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince > REFUND_POLICY.maxDaysSincePayment) {
          refundBlockReason = `결제일로부터 ${REFUND_POLICY.maxDaysSincePayment}일이 경과하여 환불이 불가합니다.`;
        } else {
          canRefund = true;
        }
      }

      return {
        id: p.id,
        mulNo: p.mul_no,
        amount: p.amount,
        vat: p.vat ?? 0,
        purpose: p.purpose ?? "subscription",
        paidAt: p.paid_at,
        providerPaidAt: p.provider_paid_at ?? null,
        refundedAt: p.refunded_at ?? null,
        receiptUrl: p.receipt_url ?? null,
        canRefund,
        refundBlockReason,
      };
    });

    return NextResponse.json({ items });
  } catch (err) {
    console.error("[billing/history] Fatal error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
