import { createServerClient } from "@/shared/lib/supabase";
import { chargeBillingKey } from "@/shared/lib/toss-payments";
import type { PlanId } from "@/shared/config/constants";
import { PLAN_PRICING } from "@/shared/config/constants";

export interface Subscription {
  id: string;
  userId: string;
  plan: PlanId;
  status: string;
  tossBillingKey: string | null;
  tossCustomerKey: string | null;
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
    tossBillingKey: data.toss_billing_key,
    tossCustomerKey: data.toss_customer_key,
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
  customerKey: string;
}): Promise<void> {
  const supabase = await createServerClient();
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Upsert: deactivate existing, create new
  await supabase
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("user_id", params.userId)
    .eq("status", "active");

  await supabase.from("subscriptions").insert({
    user_id: params.userId,
    plan: params.plan,
    status: "active",
    toss_billing_key: params.billingKey,
    toss_customer_key: params.customerKey,
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
  if (!subscription.tossBillingKey || !subscription.tossCustomerKey) {
    return false;
  }

  const pricing = PLAN_PRICING[subscription.plan];
  if (!pricing || pricing.monthly === 0) return false;

  const orderId = `sub_${subscription.id}_${Date.now()}`;

  const supabase = await createServerClient();

  try {
    await chargeBillingKey({
      billingKey: subscription.tossBillingKey,
      customerKey: subscription.tossCustomerKey,
      amount: pricing.monthly,
      orderId,
      orderName: `옵티써치 ${pricing.label} 정기결제`,
    });

    // Extend period by 30 days from now
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
