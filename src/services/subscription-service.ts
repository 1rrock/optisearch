import { createServerClient } from "@/shared/lib/supabase";
import { chargeByBillingKey } from "@/shared/lib/portone";
import type { PlanId } from "@/shared/config/constants";
import { PLAN_PRICING } from "@/shared/config/constants";

export interface Subscription {
  id: string;
  userId: string;
  plan: PlanId;
  status: string;
  billingKey: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
}

/**
 * Get user's active subscription.
 */
export async function getSubscription(userId: string): Promise<Subscription | null> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    plan: data.plan as PlanId,
    status: data.status,
    billingKey: data.billing_key ?? data.toss_billing_key,
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
  };
}

/**
 * Create or update a subscription after billing key registration.
 */
export async function createSubscription(params: {
  userId: string;
  plan: PlanId;
  billingKey: string;
}): Promise<void> {
  const supabase = await createServerClient();
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Deactivate existing subscription
  await supabase
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("user_id", params.userId)
    .eq("status", "active");

  await supabase.from("subscriptions").insert({
    user_id: params.userId,
    plan: params.plan,
    status: "active",
    billing_key: params.billingKey,
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
  });

  // Update user profile plan
  await supabase
    .from("user_profiles")
    .update({ plan: params.plan })
    .eq("id", params.userId);
}

/**
 * Cancel a subscription.
 */
export async function cancelSubscription(userId: string): Promise<void> {
  const supabase = await createServerClient();

  await supabase
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("user_id", userId)
    .eq("status", "active");

  await supabase
    .from("user_profiles")
    .update({ plan: "free" })
    .eq("id", userId);
}

/**
 * Process recurring billing for a subscription.
 */
export async function processRecurringBilling(subscription: Subscription): Promise<boolean> {
  if (!subscription.billingKey) {
    return false;
  }

  const pricing = PLAN_PRICING[subscription.plan];
  if (!pricing || pricing.monthly === 0) return false;

  const paymentId = `sub_${subscription.id}_${Date.now()}`;
  const supabase = await createServerClient();

  try {
    await chargeByBillingKey({
      billingKey: subscription.billingKey,
      paymentId,
      amount: pricing.monthly,
      orderName: `옵티써치 ${pricing.label} 정기결제`,
      customerId: subscription.userId,
    });

    // Extend period by 30 days
    const now = new Date();
    const newEnd = new Date(now);
    newEnd.setDate(newEnd.getDate() + 30);

    await supabase
      .from("subscriptions")
      .update({
        current_period_start: now.toISOString(),
        current_period_end: newEnd.toISOString(),
      })
      .eq("id", subscription.id);

    return true;
  } catch (err) {
    console.error(
      `[billing] Failed to charge subscription ${subscription.id} (user: ${subscription.userId}):`,
      err instanceof Error ? err.message : err,
    );

    await supabase
      .from("subscriptions")
      .update({ status: "payment_failed" })
      .eq("id", subscription.id);

    return false;
  }
}
