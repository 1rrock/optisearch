import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { createServerClient } from "@/shared/lib/supabase";
import { cancelPayment, cancelRebill, deleteBillKey, isPayAppTimeoutError } from "@/shared/lib/payapp";
import { isPaymentHistoryColumnMissingError } from "@/shared/lib/payment-history-compat";
import { addDaysToKstDate, getKstDateString } from "@/shared/lib/payapp-time";
import { buildProratedRefundBreakdown, type RefundableChargeRow } from "@/shared/lib/payapp-refunds";
import { requiresRemoteCleanupReview } from "@/shared/lib/payapp-launch-rules";

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const supabase = await createServerClient();
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("id, rebill_no, bill_key, status, current_period_end")
      .eq("user_id", user.userId)
      .in("status", ["active", "pending_billing", "pending_cancel"])
      .maybeSingle();

    if (subError) {
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    if (!subscription) {
      return NextResponse.json({ error: "해지할 구독이 없습니다." }, { status: 400 });
    }

    if (subscription.status === "pending_cancel") {
      return NextResponse.json({
        ok: true,
        message: "이미 다음 결제부터 해지 예정입니다.",
        usableUntil: subscription.current_period_end,
      });
    }

    const cancelRequestedAt = new Date().toISOString();
    const cleanupPayload = {
      rebillNo: subscription.rebill_no,
      billKey: subscription.bill_key,
      requestedAt: cancelRequestedAt,
    };

    if (subscription.status === "pending_billing") {
      const cleanup = await tryDisableFutureBilling(subscription.bill_key, subscription.rebill_no);
      const hasCurrentEntitlement =
        !!subscription.current_period_end && subscription.current_period_end >= getKstDateString();
      const targetStatus = hasCurrentEntitlement ? "pending_cancel" : "stopped";
      const targetPeriodEnd = hasCurrentEntitlement
        ? subscription.current_period_end
        : addDaysToKstDate(cancelRequestedAt, -1);

      if (!cleanup.ok) {
        await queueRemoteCleanupReview(
          supabase,
          user.userId,
          subscription.id,
          cleanup.error,
          cleanupPayload
        );

        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            status: targetStatus,
            current_period_end: targetPeriodEnd,
            next_billing_date: null,
            pending_action: null,
            pending_plan: null,
            pending_start_date: null,
            bill_key: null,
            rebill_no: null,
          })
          .eq("id", subscription.id);

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({
          ok: true,
          message:
            "진행 중인 결제가 취소되었지만 결제수단 해제 확인이 필요합니다. 고객센터에서 확인 후 안내드립니다.",
          usableUntil: hasCurrentEntitlement ? targetPeriodEnd : null,
          manualReview: true,
        });
      }

      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          status: targetStatus,
          current_period_end: targetPeriodEnd,
          next_billing_date: null,
          pending_action: null,
          pending_plan: null,
          pending_start_date: null,
          bill_key: null,
          rebill_no: null,
        })
        .eq("id", subscription.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        message: hasCurrentEntitlement
          ? "진행 중인 결제가 취소되었습니다. 현재 이용 권한은 만료일까지 유지됩니다."
          : "진행 중인 결제가 취소되어 구독 준비가 중단되었습니다.",
        usableUntil: hasCurrentEntitlement ? targetPeriodEnd : null,
      });
    }

    const cleanup = await tryDisableFutureBilling(subscription.bill_key, subscription.rebill_no);
    const cleanupQueuedAt = requiresRemoteCleanupReview(cleanup.ok) ? cancelRequestedAt : null;

    if (!cleanup.ok) {
      await queueRemoteCleanupReview(
        supabase,
        user.userId,
        subscription.id,
        cleanup.error,
        cleanupPayload
        );
    }

    let { data: refundablePayments, error: paymentError } = await supabase
      .from("payment_history")
      .select("mul_no, amount, purpose, paid_at, provider_paid_at, refunded_at, refund_amount")
      .eq("user_id", user.userId)
      .in("purpose", ["subscription", "upgrade_diff"])
      .eq("pay_state", 4)
      .limit(50);

    if (paymentError && isPaymentHistoryColumnMissingError(paymentError, ["provider_paid_at", "refund_amount"])) {
      const fallback = await supabase
        .from("payment_history")
        .select("mul_no, amount, purpose, paid_at, refunded_at")
        .eq("user_id", user.userId)
        .in("purpose", ["subscription", "upgrade_diff"])
        .eq("pay_state", 4)
        .limit(50);

      refundablePayments = (fallback.data ?? []).map((payment) => ({
        ...payment,
        provider_paid_at: null,
        refund_amount: null,
      }));
      paymentError = fallback.error;
    }

    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 500 });
    }

    const refundBreakdown = subscription.current_period_end
      ? buildProratedRefundBreakdown(
          (refundablePayments ?? []) as RefundableChargeRow[],
          subscription.current_period_end,
          cancelRequestedAt
        )
      : {
          remainingDays: 0,
          cycleStartDate: "",
          cycleEndDate: subscription.current_period_end ?? "",
          totalRefundAmount: 0,
          lines: [],
        };

    let refundedAmount = 0;
    let pendingRefundAmount = 0;

    for (const line of refundBreakdown.lines) {
      try {
        const refundResult = await cancelPayment({
          mulNo: line.mulNo,
          memo: `해지 비례환불 (${line.purpose})`,
          cancelprice: line.refundAmount,
        });

        if (refundResult.state !== 1) {
          pendingRefundAmount += line.refundAmount;
          await queueProratedRefundRetry(supabase, user.userId, line.mulNo, line.refundAmount, refundResult.errorMessage ?? "cancelPayment failed");
          continue;
        }

        refundedAmount += line.refundAmount;
        let { error: historyUpdateError } = await supabase
          .from("payment_history")
          .update({
            refunded_at: cancelRequestedAt,
            refund_amount: line.refundAmount,
          })
          .eq("mul_no", line.mulNo);

        if (historyUpdateError && isPaymentHistoryColumnMissingError(historyUpdateError, ["refund_amount"])) {
          const fallback = await supabase
            .from("payment_history")
            .update({ refunded_at: cancelRequestedAt })
            .eq("mul_no", line.mulNo);
          historyUpdateError = fallback.error;
        }

        if (historyUpdateError) {
          pendingRefundAmount += line.refundAmount;
          refundedAmount -= line.refundAmount;
          await queueProratedRefundRetry(supabase, user.userId, line.mulNo, line.refundAmount, historyUpdateError.message);
        }
      } catch (error) {
        pendingRefundAmount += line.refundAmount;
        const reason = error instanceof Error ? error.message : String(error);
        await queueProratedRefundRetry(supabase, user.userId, line.mulNo, line.refundAmount, reason);

        if (isPayAppTimeoutError(error)) {
          await queueRemoteCleanupReview(
            supabase,
            user.userId,
            subscription.id,
            `refund timeout for ${line.mulNo}`,
            { refundedMulNo: line.mulNo, refundAmount: String(line.refundAmount) }
          );
        }
      }
    }

    const manualReviewRequired =
      requiresRemoteCleanupReview(cleanup.ok) ||
      pendingRefundAmount > 0 ||
      (!subscription.current_period_end && subscription.status === "active");

    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: "pending_cancel",
        next_billing_date: null,
        cancel_requested_at: cancelRequestedAt,
        remote_cleanup_required: requiresRemoteCleanupReview(cleanup.ok),
        remote_cleanup_queued_at: cleanupQueuedAt,
        last_manual_review_at: manualReviewRequired ? cancelRequestedAt : null,
        last_manual_review_reason: !subscription.current_period_end
          ? "current_period_end missing for prorated refund"
          : cleanup.ok
            ? pendingRefundAmount > 0
              ? "prorated refund requires retry/manual review"
              : null
            : cleanup.error,
      })
      .eq("id", subscription.id)
      .in("status", ["active", "pending_billing"]);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: cleanup.ok
        ? pendingRefundAmount > 0
          ? "구독 해지와 비례환불이 접수되었습니다. 일부 환불은 수동 확인 후 마무리됩니다."
          : "구독 해지와 자동 비례환불이 처리되었습니다. 현재 이용기간 종료일까지 계속 사용할 수 있습니다."
        : "구독 해지와 비례환불이 접수되었으며, 결제수단 해제 또는 일부 환불은 수동 확인 후 마무리됩니다.",
      usableUntil: subscription.current_period_end,
      manualReview: manualReviewRequired,
      refundAmount: refundedAmount,
      pendingRefundAmount,
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
    throw new Error(`[subscription/cancel] remote cleanup queue failed: ${error.message}`);
  }
}

async function queueProratedRefundRetry(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  mulNo: string,
  refundAmount: number,
  reason: string
): Promise<void> {
  const { error } = await supabase.from("failed_compensations").insert({
    user_id: userId,
    mul_no: mulNo,
    step: "prorated_refund",
    payload: { refundAmount, mulNo },
    last_error: reason,
    next_retry_at: new Date(Date.now() + 60_000).toISOString(),
  });

  if (error) {
    throw new Error(`[subscription/cancel] refund retry queue failed: ${error.message}`);
  }
}
