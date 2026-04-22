import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { createServerClient } from "@/shared/lib/supabase";
import { cancelPayment, cancelRebill, deleteBillKey } from "@/shared/lib/payapp";
import { REFUND_POLICY } from "@/shared/config/constants";
import { addDaysToKstDate } from "@/shared/lib/payapp-time";
import {
  pickFirstSubscriptionPaymentMulNo,
  requiresRemoteCleanupReview,
} from "@/shared/lib/payapp-launch-rules";

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

    const { data: subscriptionPayments, error: firstPaymentError } = await supabase
      .from("payment_history")
      .select("mul_no, purpose, provider_paid_at, paid_at")
      .eq("user_id", user.userId)
      .eq("purpose", "subscription")
      .not("paid_at", "is", null)
      .limit(100);

    if (firstPaymentError) {
      return NextResponse.json({ error: firstPaymentError.message }, { status: 500 });
    }

    const firstSubscriptionMulNo = pickFirstSubscriptionPaymentMulNo(subscriptionPayments ?? []);
    if (!firstSubscriptionMulNo || firstSubscriptionMulNo !== mulNo) {
      return NextResponse.json(
        { error: "첫 정기구독 결제 건만 셀프 환불이 가능합니다." },
        { status: 400 }
      );
    }

    const paidAtIso = paymentRow.provider_paid_at ?? paymentRow.paid_at;
    if (!paidAtIso) {
      return NextResponse.json({ error: "결제 일시 정보가 없습니다." }, { status: 400 });
    }

    const paidAt = new Date(paidAtIso);
    const daysSincePayment = (Date.now() - paidAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSincePayment > REFUND_POLICY.maxDaysSincePayment) {
      return NextResponse.json(
        {
          error: `결제일로부터 ${REFUND_POLICY.maxDaysSincePayment}일이 경과하여 환불이 불가합니다.`,
        },
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
        {
          error: `키워드 검색을 ${REFUND_POLICY.maxKeywordSearches}회 초과하여 환불이 불가합니다.`,
        },
        { status: 400 }
      );
    }

    const cancelResult = await cancelPayment({
      mulNo,
      memo: "7일 이내 첫 정기구독 결제 환불",
    });

    if (cancelResult.state !== 1) {
      return NextResponse.json(
        {
          error: "결제 취소 API 호출에 실패했습니다. 고객센터에서 확인이 필요합니다.",
          detail: cancelResult.errorMessage,
        },
        { status: 502 }
      );
    }

    const nowIso = new Date().toISOString();
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("id, bill_key, rebill_no")
      .eq("user_id", user.userId)
      .maybeSingle();

    const cleanup = await tryDisableFutureBilling(subscription?.bill_key ?? null, subscription?.rebill_no ?? null);

    if (subscription && !cleanup.ok) {
      await queueRemoteCleanupReview(
        supabase,
        user.userId,
        subscription.id,
        cleanup.error,
        {
          billKey: subscription.bill_key,
          rebillNo: subscription.rebill_no,
          refundedMulNo: mulNo,
        }
      );
    }

    const { error: paymentUpdateError } = await supabase
      .from("payment_history")
      .update({
        refunded_at: nowIso,
        refund_amount: paymentRow.amount,
      })
      .eq("mul_no", mulNo);

    if (paymentUpdateError) {
      return NextResponse.json({ error: paymentUpdateError.message }, { status: 500 });
    }

    if (subscription) {
      const { error: subscriptionUpdateError } = await supabase
        .from("subscriptions")
        .update({
          status: "stopped",
          stopped_reason: "refunded",
          current_period_end: addDaysToKstDate(nowIso, -1),
          next_billing_date: null,
          cancel_requested_at: nowIso,
          remote_cleanup_required: requiresRemoteCleanupReview(cleanup.ok),
          remote_cleanup_queued_at: requiresRemoteCleanupReview(cleanup.ok) ? nowIso : null,
          last_manual_review_at: requiresRemoteCleanupReview(cleanup.ok) ? nowIso : null,
          last_manual_review_reason: !cleanup.ok ? cleanup.error : null,
        })
        .eq("id", subscription.id);

      if (subscriptionUpdateError) {
        return NextResponse.json({ error: subscriptionUpdateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      refundedAmount: paymentRow.amount,
      manualReview: requiresRemoteCleanupReview(cleanup.ok),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

async function tryDisableFutureBilling(
  billKey: string | null,
  rebillNo: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (billKey) {
    const result = await deleteBillKey({ billKey });
    if (result.state !== 1) {
      return { ok: false, error: result.errorMessage ?? "billDelete failed" };
    }
    return { ok: true };
  }

  if (rebillNo) {
    const result = await cancelRebill(rebillNo);
    if (result.state !== 1) {
      return { ok: false, error: result.errorMessage ?? "rebillCancel failed" };
    }
    return { ok: true };
  }

  return { ok: true };
}

async function queueRemoteCleanupReview(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  subscriptionId: string,
  reason: string,
  payload: Record<string, string | null>
): Promise<void> {
  const nowIso = new Date().toISOString();
  const { error } = await supabase.from("payment_attempts").insert({
    attempt_key: `remote_cleanup:${subscriptionId}:${nowIso}`,
    user_id: userId,
    subscription_id: subscriptionId,
    attempt_kind: "remote_cleanup",
    status: "manual_review",
    amount: 0,
    provider_request_payload: payload,
    manual_review_reason: reason,
    requested_at: nowIso,
    resolved_at: nowIso,
  });

  if (error) {
    throw new Error(`[payments/refund] remote cleanup queue failed: ${error.message}`);
  }
}
