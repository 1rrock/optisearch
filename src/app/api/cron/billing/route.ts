import { createServerClient } from "@/shared/lib/supabase";
import { processRecurringBilling } from "@/services/subscription-service";

/**
 * Vercel Cron job — runs daily to process recurring billing.
 * Configure in vercel.json: { "crons": [{ "path": "/api/cron/billing", "schedule": "0 9 * * *" }] }
 */
export async function GET(request: Request) {
  // Verify cron secret (Vercel sets CRON_SECRET)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createServerClient();
    const now = new Date().toISOString();

    // Find subscriptions due for renewal
    const { data: dueSubscriptions } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("status", "active")
      .lte("current_period_end", now);

    if (!dueSubscriptions?.length) {
      return Response.json({ message: "No subscriptions due", processed: 0 });
    }

    let processed = 0;
    let failed = 0;

    for (const sub of dueSubscriptions) {
      const success = await processRecurringBilling({
        id: sub.id,
        userId: sub.user_id,
        plan: sub.plan,
        status: sub.status,
        tossBillingKey: sub.toss_billing_key,
        tossCustomerKey: sub.toss_customer_key,
        currentPeriodStart: sub.current_period_start,
        currentPeriodEnd: sub.current_period_end,
      });

      if (success) processed++;
      else failed++;
    }

    return Response.json({ processed, failed, total: dueSubscriptions.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
