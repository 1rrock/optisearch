import { createServerClient } from "@/shared/lib/supabase";
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
 * Process recurring billing for a subscription. (DISABLED: PortOne removed)
 */
export async function processRecurringBilling(subscription: Subscription): Promise<boolean> {
  console.log(`[billing] Recurring billing is currently disabled for subscription: ${subscription.id}`);
  return false;
}
