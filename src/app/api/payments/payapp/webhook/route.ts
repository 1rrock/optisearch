import { billPay, verifyWebhookLinkVal } from "@/shared/lib/payapp";
import { PLAN_PRICING, UPGRADE_DIFF } from "@/shared/config/constants";
import type { PlanId } from "@/shared/config/constants";
import { isPaymentAttemptsMissingError } from "@/shared/lib/payment-attempt-compat";
import { isPaymentHistoryColumnMissingError } from "@/shared/lib/payment-history-compat";
import { createServerClient } from "@/shared/lib/supabase";
import { addDaysToKstDate, getKstDateString } from "@/shared/lib/payapp-time";
import {
  buildPaymentAttemptKey,
  resolveAttemptFailureStatus,
  shouldDispatchFirstCharge,
} from "@/shared/lib/payapp-launch-rules";
import {
  buildWebhookKeys,
  parsePayAppWebhook,
  type PayAppWebhookPayload,
} from "../_lib/payapp-webhook";
import {
  calcProRatedDiff,
  isGracePeriodEligible,
} from "@/shared/lib/subscription-upgrade-rules";

type SupabaseClient = Awaited<ReturnType<typeof createServerClient>>;

type ProcessingOutcome =
  | { kind: "processed" }
  | { kind: "manual_review"; reason: string };

type WebhookEventRow = {
  id: string;
  processing_status: "received" | "processed" | "duplicate" | "failed" | "manual_review";
};

type SubscriptionRow = {
  id: string;
  status: string | null;
  plan: string | null;
  pending_action?: string | null;
  pending_plan?: string | null;
  bill_key: string | null;
  rebill_no: string | null;
  failed_charge_count: number | null;
  next_billing_date?: string | null;
  current_period_end?: string | null;
};

const isLocalPayAppTestMode = process.env.PAYAPP_LOCAL_TEST_MODE === "true";

function resolveBillKeyForProcessing(payload: PayAppWebhookPayload): string | null {
  if (payload.billKey) {
    return payload.billKey;
  }

  if (isLocalPayAppTestMode && payload.mulNo) {
    return `local-test-${payload.mulNo}`;
  }

  return null;
}

type PaymentHistoryUpsert = {
  userId: string;
  mulNo: string | null;
  rebillNo: string | null;
  amount: number;
  payState: number;
  payType: string | null;
  purpose: string;
  receiptUrl: string | null;
  raw: Record<string, string>;
  payappEventKey: string;
  providerPaidAt: string | null;
  providerCancelledAt: string | null;
};

export async function POST(request: Request) {
  const formText = await request.text();
  const payload = parsePayAppWebhook(formText);

  if (!payload.linkval || !verifyWebhookLinkValSafe(payload.linkval)) {
    return fail("invalid PayApp linkval", 400);
  }

  if (!payload.userId) {
    return fail("missing PayApp userId in var1", 400);
  }

  const { eventKey, lifecycleKey } = buildWebhookKeys(payload);
  const supabase = await createServerClient();
  const eventRow = await ensureWebhookEventRow(supabase, payload, eventKey, lifecycleKey);

  if (eventRow.processing_status === "processed" || eventRow.processing_status === "duplicate") {
    return ok();
  }

  try {
    const outcome = await processWebhookEvent(supabase, payload, eventKey);

    if (outcome.kind === "manual_review") {
      await updateWebhookEventStatus(supabase, eventRow.id, "manual_review", outcome.reason);
      return ok();
    }

    await updateWebhookEventStatus(supabase, eventRow.id, "processed", null);
    return ok();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateWebhookEventStatus(supabase, eventRow.id, "failed", message);
    return fail(message, 500);
  }
}

function verifyWebhookLinkValSafe(linkval: string): boolean {
  try {
    return verifyWebhookLinkVal(linkval);
  } catch {
    return false;
  }
}

async function ensureWebhookEventRow(
  supabase: SupabaseClient,
  payload: PayAppWebhookPayload,
  eventKey: string,
  lifecycleKey: string
): Promise<WebhookEventRow> {
  const nowIso = new Date().toISOString();
  const insertPayload = {
    event_key: eventKey,
    lifecycle_key: lifecycleKey,
    mul_no: payload.mulNo,
    pay_state: payload.payState,
    purpose: payload.purpose,
    user_id: payload.userId,
    rebill_no: payload.rebillNo,
    provider_paid_at: payload.payDateIso,
    provider_cancelled_at: payload.cancelDateIso,
    received_at: nowIso,
    processing_status: "received" as const,
    failure_reason: null,
    raw: payload.raw,
  };

  const { data: inserted, error: insertError } = await supabase
    .from("webhook_events")
    .insert(insertPayload)
    .select("id, processing_status")
    .maybeSingle();

  if (!insertError && inserted) {
    return inserted as WebhookEventRow;
  }

  if (insertError && insertError.code !== "23505") {
    throw new Error(`[webhook] event insert failed: ${insertError.message}`);
  }

  const { data: existing, error: selectError } = await supabase
    .from("webhook_events")
    .select("id, processing_status")
    .eq("event_key", eventKey)
    .maybeSingle();

  if (selectError || !existing) {
    throw new Error(`[webhook] event fetch failed: ${selectError?.message ?? "missing event row"}`);
  }

  if (existing.processing_status === "processed" || existing.processing_status === "duplicate") {
    return existing as WebhookEventRow;
  }

  const { error: refreshError } = await supabase
    .from("webhook_events")
    .update({
      received_at: nowIso,
      processing_status: "received",
      failure_reason: null,
      raw: payload.raw,
      user_id: payload.userId,
      purpose: payload.purpose,
      pay_state: payload.payState,
      mul_no: payload.mulNo,
      rebill_no: payload.rebillNo,
      provider_paid_at: payload.payDateIso,
      provider_cancelled_at: payload.cancelDateIso,
    })
    .eq("id", existing.id);

  if (refreshError) {
    throw new Error(`[webhook] event refresh failed: ${refreshError.message}`);
  }

  return {
    id: existing.id,
    processing_status: "received",
  };
}

async function updateWebhookEventStatus(
  supabase: SupabaseClient,
  eventId: string,
  status: "processed" | "failed" | "manual_review",
  reason: string | null
): Promise<void> {
  const { error } = await supabase
    .from("webhook_events")
    .update({
      processing_status: status,
      failure_reason: reason,
      processed_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  if (error) {
    throw new Error(`[webhook] failed to update event status: ${error.message}`);
  }
}

async function processWebhookEvent(
  supabase: SupabaseClient,
  payload: PayAppWebhookPayload,
  eventKey: string
): Promise<ProcessingOutcome> {
  if (payload.payState === 4 && payload.purpose === "billkey_registration") {
    return saveBillKeyRegistration(supabase, payload);
  }

  if (payload.payState === 4 && payload.purpose === "subscription") {
    return handleSubscriptionSuccess(supabase, payload, eventKey);
  }

  if ((payload.payState === 9 || payload.payState === 64) && payload.purpose === "subscription") {
    return handleSubscriptionCancellation(supabase, payload, eventKey);
  }

  if ((payload.payState === 70 || payload.payState === 71) && payload.purpose === "subscription") {
    await upsertPaymentHistory(supabase, {
      userId: payload.userId,
      mulNo: payload.mulNo,
      rebillNo: payload.rebillNo,
      amount: payload.price,
      payState: payload.payState,
      payType: payload.payType,
      purpose: payload.purpose,
      receiptUrl: payload.receiptUrl,
      raw: payload.raw,
      payappEventKey: eventKey,
      providerPaidAt: payload.payDateIso,
      providerCancelledAt: payload.cancelDateIso,
    });

    return {
      kind: "manual_review",
      reason: `partial cancellation received for subscription lifecycle (pay_state=${payload.payState})`,
    };
  }

  if (payload.purpose === "subscription" && payload.payState !== 1 && payload.payState !== 10) {
    return handleSubscriptionFailure(supabase, payload);
  }

  if (payload.payState === 4 && payload.purpose === "upgrade_diff") {
    return handleUpgradeSuccess(supabase, payload, eventKey);
  }

  return { kind: "processed" };
}

async function saveBillKeyRegistration(
  supabase: SupabaseClient,
  payload: PayAppWebhookPayload
): Promise<ProcessingOutcome> {
  const billKey = resolveBillKeyForProcessing(payload);

  if (!billKey) {
    return {
      kind: "manual_review",
      reason: "billkey_registration succeeded without encBill",
    };
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .update({
      bill_key: billKey,
    })
    .eq("user_id", payload.userId)
    .eq("status", "pending_billing")
    .select("id, plan, pending_action, pending_plan, next_billing_date, current_period_end")
    .maybeSingle();

  if (error) {
    throw new Error(`[webhook] bill key save failed: ${error.message}`);
  }

  if (!data) {
    return {
      kind: "manual_review",
      reason: "billkey_registration received without pending_billing subscription row",
    };
  }

  const subscription = data as SubscriptionRow;
  const todayKst = getKstDateString();

  const hasGraceDiffUpgradeMarker =
    subscription.plan === "basic" &&
    subscription.pending_action === "upgrade" &&
    subscription.pending_plan === "pro";

  if (hasGraceDiffUpgradeMarker) {
    if (!subscription.current_period_end || subscription.current_period_end < todayKst) {
      return {
        kind: "manual_review",
        reason: "grace upgrade marker is missing a valid current_period_end",
      };
    }

    return dispatchGracePeriodUpgradeCharge(supabase, payload, subscription, billKey);
  }

  if (!shouldDispatchFirstCharge(subscription.next_billing_date, todayKst)) {
    const isDeferredSamePlanContinuation =
      !!subscription.current_period_end &&
      !subscription.pending_action &&
      !subscription.pending_plan;

    if (isDeferredSamePlanContinuation) {
      const { error: activationError } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
        })
        .eq("id", subscription.id)
        .eq("status", "pending_billing");

      if (activationError) {
        throw new Error(`[webhook] deferred continuation activation failed: ${activationError.message}`);
      }
    }

    return { kind: "processed" };
  }

  const plan = subscription.plan as PlanId | null;
  if (!plan || (plan !== "basic" && plan !== "pro")) {
    return {
      kind: "manual_review",
      reason: "pending_billing subscription is missing a billable plan",
    };
  }

  const attempt = await ensureFirstChargeAttempt(supabase, subscription.id, payload.userId, billKey, plan);
  if (attempt.status !== "pending") {
    return { kind: "processed" };
  }

  try {
    const chargeResult = await billPay({
      billKey,
      goodname: `옵티서치 ${plan === "pro" ? "프로" : "베이직"}`,
      price: PLAN_PRICING[plan].monthly,
      recvphone: process.env.PAYAPP_DEFAULT_RECVPHONE ?? "01000000000",
      var1: `${payload.userId}:${plan}`,
      var2: "subscription",
      feedbackurl: process.env.PAYAPP_FEEDBACK_URL,
    });

    if (chargeResult.state !== 1) {
      if (attempt.tracked && attempt.id) {
        const { error: attemptUpdateError } = await supabase
          .from("payment_attempts")
          .update({
            status: "failed",
            provider_response_payload: chargeResult.raw,
            manual_review_reason: chargeResult.errorMessage ?? "first charge billPay failed",
            resolved_at: new Date().toISOString(),
          })
          .eq("id", attempt.id);

        if (attemptUpdateError && !isPaymentAttemptsMissingError(attemptUpdateError)) {
          throw new Error(`[webhook] first-charge attempt update failed: ${attemptUpdateError.message}`);
        }
      }

      await supabase
        .from("subscriptions")
        .update({
          next_billing_date: null,
        })
        .eq("id", subscription.id);

      return {
        kind: "manual_review",
        reason: chargeResult.errorMessage ?? "first charge billPay failed",
      };
    }

    if (attempt.tracked && attempt.id) {
      const { error: attemptUpdateError } = await supabase
        .from("payment_attempts")
        .update({
          status: "dispatched",
          mul_no: chargeResult.mulNo ?? null,
          provider_response_payload: chargeResult.raw,
        })
        .eq("id", attempt.id);

      if (attemptUpdateError && !isPaymentAttemptsMissingError(attemptUpdateError)) {
        throw new Error(`[webhook] first-charge attempt update failed: ${attemptUpdateError.message}`);
      }
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    if (attempt.tracked && attempt.id) {
      const { error: attemptUpdateError } = await supabase
        .from("payment_attempts")
        .update({
          status: resolveAttemptFailureStatus(error),
          provider_response_payload: { error: reason },
          manual_review_reason: reason,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", attempt.id);

      if (attemptUpdateError && !isPaymentAttemptsMissingError(attemptUpdateError)) {
        throw new Error(`[webhook] first-charge attempt update failed: ${attemptUpdateError.message}`);
      }
    }

    await supabase
      .from("subscriptions")
      .update({
        next_billing_date: null,
      })
      .eq("id", subscription.id);

    return { kind: "manual_review", reason };
  }

  return { kind: "processed" };
}

async function ensureFirstChargeAttempt(
  supabase: SupabaseClient,
  subscriptionId: string,
  userId: string,
  billKey: string,
  plan: PlanId
): Promise<{ id: string | null; status: string; tracked: boolean }> {
  const attemptKey = buildPaymentAttemptKey("first_charge", subscriptionId, billKey);
  const { data: inserted, error: insertError } = await supabase
    .from("payment_attempts")
    .insert({
      attempt_key: attemptKey,
      user_id: userId,
      subscription_id: subscriptionId,
      attempt_kind: "first_charge",
      status: "pending",
      amount: PLAN_PRICING[plan].monthly,
      provider_request_payload: {
        billKey,
        plan,
      },
    })
    .select("id, status")
    .maybeSingle();

  if (!insertError && inserted) {
    return { ...(inserted as { id: string; status: string }), tracked: true };
  }

  if (insertError && isPaymentAttemptsMissingError(insertError)) {
    return { id: null, status: "pending", tracked: false };
  }

  if (insertError && insertError.code !== "23505") {
    throw new Error(`[webhook] first-charge attempt insert failed: ${insertError.message}`);
  }

  const { data: existing, error: existingError } = await supabase
    .from("payment_attempts")
    .select("id, status")
    .eq("attempt_key", attemptKey)
    .maybeSingle();

  if (existingError && isPaymentAttemptsMissingError(existingError)) {
    return { id: null, status: "pending", tracked: false };
  }

  if (existingError || !existing) {
    throw new Error(`[webhook] first-charge attempt fetch failed: ${existingError?.message ?? "missing attempt row"}`);
  }

  return { ...(existing as { id: string; status: string }), tracked: true };
}

async function dispatchGracePeriodUpgradeCharge(
  supabase: SupabaseClient,
  payload: PayAppWebhookPayload,
  subscription: SubscriptionRow,
  billKey: string
): Promise<ProcessingOutcome> {
  const billingDate = subscription.current_period_end ?? subscription.next_billing_date ?? null;
  const amount = calcProRatedDiff(UPGRADE_DIFF.basicToPro, billingDate);

  if (amount === 0) {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: "active",
        plan: "pro",
        next_billing_date: subscription.next_billing_date ?? subscription.current_period_end ?? null,
        pending_action: null,
        pending_plan: null,
        pending_start_date: null,
      })
      .eq("id", subscription.id)
      .eq("status", "pending_billing");

    if (error) {
      throw new Error(`[webhook] grace upgrade free activation failed: ${error.message}`);
    }

    return { kind: "processed" };
  }

  const nowIso = new Date().toISOString();
  const attemptKey = buildPaymentAttemptKey("upgrade_diff", subscription.id, nowIso);
  const { error: insertError } = await supabase.from("payment_attempts").insert({
    attempt_key: attemptKey,
    user_id: payload.userId,
    subscription_id: subscription.id,
    attempt_kind: "upgrade_diff",
    status: "pending",
    amount,
    provider_request_payload: {
      plan: "pro",
      amount,
      source: "billkey_registration",
    },
  });

  const shouldTrackAttempts = !insertError;

  if (insertError && !isPaymentAttemptsMissingError(insertError)) {
    throw new Error(`[webhook] grace upgrade attempt insert failed: ${insertError.message}`);
  }

  try {
    const chargeResult = await billPay({
      billKey,
      goodname: "옵티서치 pro 업그레이드 차액",
      price: amount,
      recvphone: process.env.PAYAPP_DEFAULT_RECVPHONE ?? "01000000000",
      var1: `${payload.userId}:pro`,
      var2: "upgrade_diff",
      feedbackurl: process.env.PAYAPP_FEEDBACK_URL,
    });

    if (chargeResult.state !== 1) {
      const reason = chargeResult.errorMessage ?? "upgrade billPay failed after billkey registration";

      if (shouldTrackAttempts) {
        const { error: attemptUpdateError } = await supabase
          .from("payment_attempts")
          .update({
            status: "failed",
            mul_no: chargeResult.mulNo ?? null,
            provider_response_payload: chargeResult.raw,
            manual_review_reason: reason,
            resolved_at: nowIso,
          })
          .eq("attempt_key", attemptKey);

        if (attemptUpdateError && !isPaymentAttemptsMissingError(attemptUpdateError)) {
          throw new Error(`[webhook] grace upgrade attempt update failed: ${attemptUpdateError.message}`);
        }
      }

      await supabase
        .from("subscriptions")
        .update({
          next_billing_date: subscription.next_billing_date,
        })
        .eq("id", subscription.id);

      return { kind: "manual_review", reason };
    }

    if (shouldTrackAttempts) {
      const { error: attemptUpdateError } = await supabase
        .from("payment_attempts")
        .update({
          status: "dispatched",
          mul_no: chargeResult.mulNo ?? null,
          provider_response_payload: chargeResult.raw,
        })
        .eq("attempt_key", attemptKey);

      if (attemptUpdateError && !isPaymentAttemptsMissingError(attemptUpdateError)) {
        throw new Error(`[webhook] grace upgrade attempt update failed: ${attemptUpdateError.message}`);
      }
    }

    return { kind: "processed" };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    if (shouldTrackAttempts) {
      const { error: attemptUpdateError } = await supabase
        .from("payment_attempts")
        .update({
          status: resolveAttemptFailureStatus(error),
          provider_response_payload: { error: reason },
          manual_review_reason: reason,
          resolved_at: new Date().toISOString(),
        })
        .eq("attempt_key", attemptKey);

      if (attemptUpdateError && !isPaymentAttemptsMissingError(attemptUpdateError)) {
        throw new Error(`[webhook] grace upgrade attempt update failed: ${attemptUpdateError.message}`);
      }
    }

    await supabase
      .from("subscriptions")
      .update({
        next_billing_date: subscription.next_billing_date,
      })
      .eq("id", subscription.id);

    return { kind: "manual_review", reason };
  }
}

async function handleSubscriptionSuccess(
  supabase: SupabaseClient,
  payload: PayAppWebhookPayload,
  eventKey: string
): Promise<ProcessingOutcome> {
  if (!payload.planFromVar1) {
    return {
      kind: "manual_review",
      reason: "subscription success missing plan in var1",
    };
  }

  await upsertPaymentHistory(supabase, {
    userId: payload.userId,
    mulNo: payload.mulNo,
    rebillNo: payload.rebillNo,
    amount: payload.price,
    payState: payload.payState,
    payType: payload.payType,
    purpose: payload.purpose,
    receiptUrl: payload.receiptUrl,
    raw: payload.raw,
    payappEventKey: eventKey,
    providerPaidAt: payload.payDateIso,
    providerCancelledAt: payload.cancelDateIso,
  });

  const subscription = await getSubscriptionRow(supabase, payload.userId);
  if (!subscription) {
    return {
      kind: "manual_review",
      reason: "subscription success received without local subscription row",
    };
  }

  if (subscription.status !== "active" && subscription.status !== "pending_billing") {
    return {
      kind: "manual_review",
      reason: `subscription success received for status=${subscription.status ?? "null"}`,
    };
  }

  const periodEnd = addDaysToKstDate(payload.payDateIso, 30);
  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      plan: payload.planFromVar1,
      current_period_end: periodEnd,
      next_billing_date: periodEnd,
      last_charged_at: payload.payDateIso ?? new Date().toISOString(),
      failed_charge_count: 0,
      pending_action: null,
      pending_plan: null,
      pending_start_date: null,
      ...(payload.rebillNo && !subscription.bill_key ? { rebill_no: payload.rebillNo } : {}),
    })
    .eq("id", subscription.id)
    .in("status", ["active", "pending_billing"]);

  if (updateError) {
    throw new Error(`[webhook] subscription activation failed: ${updateError.message}`);
  }

  await resolvePaymentAttempt(supabase, payload.mulNo, eventKey, "confirmed", null);
  return { kind: "processed" };
}

async function handleSubscriptionCancellation(
  supabase: SupabaseClient,
  payload: PayAppWebhookPayload,
  eventKey: string
): Promise<ProcessingOutcome> {
  await upsertPaymentHistory(supabase, {
    userId: payload.userId,
    mulNo: payload.mulNo,
    rebillNo: payload.rebillNo,
    amount: payload.price,
    payState: payload.payState,
    payType: payload.payType,
    purpose: payload.purpose,
    receiptUrl: payload.receiptUrl,
    raw: payload.raw,
    payappEventKey: eventKey,
    providerPaidAt: payload.payDateIso,
    providerCancelledAt: payload.cancelDateIso,
  });

  const subscription = await getSubscriptionRow(supabase, payload.userId);
  if (!subscription) {
    return {
      kind: "manual_review",
      reason: "subscription cancellation received without local subscription row",
    };
  }

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "stopped",
      stopped_reason: "refunded",
      current_period_end: addDaysToKstDate(payload.cancelDateIso ?? payload.payDateIso, -1),
      next_billing_date: null,
      failed_charge_count: 0,
      remote_cleanup_required: Boolean(subscription.bill_key || subscription.rebill_no),
      remote_cleanup_queued_at: null,
      cancel_requested_at: payload.cancelDateIso ?? new Date().toISOString(),
      last_manual_review_at: null,
      last_manual_review_reason: null,
    })
    .eq("id", subscription.id);

  if (error) {
    throw new Error(`[webhook] subscription cancellation update failed: ${error.message}`);
  }

  await resolvePaymentAttempt(supabase, payload.mulNo, eventKey, "cancelled", null);
  return { kind: "processed" };
}

async function handleSubscriptionFailure(
  supabase: SupabaseClient,
  payload: PayAppWebhookPayload
): Promise<ProcessingOutcome> {
  const subscription = await getSubscriptionRow(supabase, payload.userId);
  if (!subscription) {
    return {
      kind: "manual_review",
      reason: `subscription failure received without local subscription row (pay_state=${payload.payState})`,
    };
  }

  if (subscription.status === "pending_billing") {
    const reason = `first charge failed or is ambiguous (pay_state=${payload.payState})`;
    const { error } = await supabase
      .from("subscriptions")
      .update({
        next_billing_date: null,
        failed_charge_count: 0,
      })
      .eq("id", subscription.id);

    if (error) {
      throw new Error(`[webhook] first-charge failure update failed: ${error.message}`);
    }

    await resolvePaymentAttempt(supabase, payload.mulNo, null, "manual_review", reason);
    return { kind: "manual_review", reason };
  }

  if (subscription.status !== "active") {
    return {
      kind: "manual_review",
      reason: `subscription failure received for status=${subscription.status ?? "null"}`,
    };
  }

  const { data: newCount, error: rpcError } = await supabase.rpc("increment_failed_charge_count", {
    p_user_id: payload.userId,
  });

  if (rpcError) {
    throw new Error(`[webhook] failed_charge_count RPC failed: ${rpcError.message}`);
  }

  if (typeof newCount === "number" && newCount >= 3) {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: "stopped",
        stopped_reason: "charge_failed",
        next_billing_date: null,
        remote_cleanup_required: Boolean(subscription.bill_key || subscription.rebill_no),
        remote_cleanup_queued_at: null,
      })
      .eq("id", subscription.id)
      .eq("status", "active");

    if (error) {
      throw new Error(`[webhook] charge-failed stop update failed: ${error.message}`);
    }
  }

  await resolvePaymentAttempt(supabase, payload.mulNo, null, "failed", `renewal failed (pay_state=${payload.payState})`);
  return { kind: "processed" };
}

async function handleUpgradeSuccess(
  supabase: SupabaseClient,
  payload: PayAppWebhookPayload,
  eventKey: string
): Promise<ProcessingOutcome> {
  await upsertPaymentHistory(supabase, {
    userId: payload.userId,
    mulNo: payload.mulNo,
    rebillNo: payload.rebillNo,
    amount: payload.price,
    payState: payload.payState,
    payType: payload.payType,
    purpose: payload.purpose,
    receiptUrl: payload.receiptUrl,
    raw: payload.raw,
    payappEventKey: eventKey,
    providerPaidAt: payload.payDateIso,
    providerCancelledAt: payload.cancelDateIso,
  });

  const subscription = await getSubscriptionRow(supabase, payload.userId);
  const todayKst = getKstDateString();
  const isGraceUpgrade = isGracePeriodEligible(
    subscription?.status,
    subscription?.current_period_end,
    todayKst
  );
  const isPendingBillingGraceUpgrade =
    subscription?.status === "pending_billing" &&
    subscription.plan === "basic" &&
    subscription.pending_action === "upgrade" &&
    subscription.pending_plan === "pro" &&
    !!subscription.current_period_end &&
    subscription.current_period_end >= todayKst;

  if (!subscription || (!isGraceUpgrade && !isPendingBillingGraceUpgrade && subscription.status !== "active")) {
    return {
      kind: "manual_review",
      reason: "upgrade_diff success received without an eligible subscription row",
    };
  }

  const nextBillingDate = subscription.next_billing_date ?? subscription.current_period_end ?? null;
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      plan: "pro",
      next_billing_date: nextBillingDate,
      pending_action: null,
      pending_plan: null,
      pending_start_date: null,
    })
    .eq("id", subscription.id)
    .in("status", ["active", "pending_billing", "pending_cancel", "stopped"]);

  if (error) {
    throw new Error(`[webhook] upgrade success update failed: ${error.message}`);
  }

  await resolvePaymentAttempt(supabase, payload.mulNo, eventKey, "confirmed", null);
  return { kind: "processed" };
}

async function getSubscriptionRow(supabase: SupabaseClient, userId: string): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id, status, plan, pending_action, pending_plan, bill_key, rebill_no, failed_charge_count, next_billing_date, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`[webhook] subscription fetch failed: ${error.message}`);
  }

  return data as SubscriptionRow | null;
}

async function resolvePaymentAttempt(
  supabase: SupabaseClient,
  mulNo: string | null,
  payappEventKey: string | null,
  status: "confirmed" | "failed" | "manual_review" | "cancelled",
  reason: string | null
): Promise<void> {
  if (!mulNo) return;

  const { error } = await supabase
    .from("payment_attempts")
    .update({
      status,
      payapp_event_key: payappEventKey,
      manual_review_reason: reason,
      resolved_at: new Date().toISOString(),
    })
    .eq("mul_no", mulNo)
    .in("status", ["pending", "dispatched", "provider_unknown", "manual_review"]);

  if (error && isPaymentAttemptsMissingError(error)) {
    return;
  }

  if (error) {
    throw new Error(`[webhook] payment attempt update failed: ${error.message}`);
  }
}

async function upsertPaymentHistory(
  supabase: SupabaseClient,
  record: PaymentHistoryUpsert
): Promise<void> {
  if (!record.mulNo) return;

  let { data: existing, error: existingError } = await supabase
    .from("payment_history")
    .select("paid_at, refunded_at, refund_amount")
    .eq("mul_no", record.mulNo)
    .maybeSingle();

  if (existingError && isPaymentHistoryColumnMissingError(existingError, ["refund_amount"])) {
    const fallback = await supabase
      .from("payment_history")
      .select("paid_at, refunded_at")
      .eq("mul_no", record.mulNo)
      .maybeSingle();
    existing = fallback.data
      ? { ...fallback.data, refund_amount: null }
      : null;
    existingError = fallback.error;
  }

  if (existingError) {
    throw new Error(`[webhook] payment_history fetch failed: ${existingError.message}`);
  }

  const isRefundState = record.payState === 9 || record.payState === 64 || record.payState === 70 || record.payState === 71;
  const paidAt =
    existing?.paid_at ??
    record.providerPaidAt ??
    (record.payState === 4 ? new Date().toISOString() : null);
  const refundedAt =
    existing?.refunded_at ??
    (isRefundState ? record.providerCancelledAt ?? new Date().toISOString() : null);
  const refundAmount =
    existing?.refund_amount ??
    (isRefundState ? record.amount : null);

  const basePayload = {
    user_id: record.userId,
    mul_no: record.mulNo,
    rebill_no: record.rebillNo,
    amount: record.amount,
    vat: Math.round((record.amount * 10) / 110),
    pay_state: record.payState,
    pay_type: record.payType,
    purpose: record.purpose,
    receipt_url: record.receiptUrl,
    paid_at: paidAt,
    refunded_at: refundedAt,
    raw: record.raw,
  };

  let { error } = await supabase.from("payment_history").upsert(
    {
      ...basePayload,
      refund_amount: refundAmount,
      provider_paid_at: record.providerPaidAt,
      provider_cancelled_at: record.providerCancelledAt,
      payapp_event_key: record.payappEventKey,
    },
    { onConflict: "mul_no" }
  );

  if (error && isPaymentHistoryColumnMissingError(error, ["refund_amount", "provider_paid_at", "provider_cancelled_at", "payapp_event_key"])) {
    const fallback = await supabase.from("payment_history").upsert(basePayload, { onConflict: "mul_no" });
    error = fallback.error;
  }

  if (error) {
    throw new Error(`[webhook] payment_history upsert failed: ${error.message}`);
  }
}

function ok() {
  return new Response("SUCCESS", { status: 200 });
}

function fail(message: string, status: number) {
  return new Response(message, { status });
}
