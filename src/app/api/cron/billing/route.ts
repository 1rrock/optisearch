import { timingSafeEqual as _tse } from "node:crypto";
import { createServerClient } from "@/shared/lib/supabase";
import { processRecurringBilling } from "@/services/subscription-service";

/**
 * Vercel Cron job — runs daily to process recurring billing.
 * Configure in vercel.json: { "crons": [{ "path": "/api/cron/billing", "schedule": "0 9 * * *" }] }
 */
/** Timing-safe string comparison to prevent timing attacks on secrets */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return _tse(Buffer.from(a), Buffer.from(b));
}

export async function GET(request: Request) {
  // Verify cron secret (Vercel sets CRON_SECRET)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization") ?? "";
  if (!cronSecret || !safeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createServerClient();
    const now = new Date().toISOString();

    // Find subscriptions due for renewal (must have a billing key)
    const { data: dueSubscriptions } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("status", "active")
      .not("toss_billing_key", "is", null)
      .lte("current_period_end", now);

    if (!dueSubscriptions?.length) {
      return Response.json({ message: "No subscriptions due", processed: 0 });
    }

    let success = 0;
    let failed = 0;

    for (const sub of dueSubscriptions) {
      const ok = await processRecurringBilling({
        id: sub.id,
        userId: sub.user_id,
        plan: sub.plan,
        status: sub.status,
        tossBillingKey: sub.toss_billing_key,
        tossCustomerKey: sub.toss_customer_key,
        currentPeriodStart: sub.current_period_start,
        currentPeriodEnd: sub.current_period_end,
      });

      if (ok) success++;
      else failed++;
    }

    return Response.json({ processed: dueSubscriptions.length, success, failed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
