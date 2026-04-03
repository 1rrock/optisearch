import { createServerClient } from "@/shared/lib/supabase";
import { getPayment } from "@/shared/lib/portone";

/**
 * POST /api/webhooks/portone
 *
 * PortOne V2 webhook handler.
 * Webhook payload: { tx_id, payment_id, status }
 * Status: PAID | CANCELLED | FAILED | VIRTUAL_ACCOUNT_ISSUED
 *
 * Verification: Re-fetch payment from PortOne API (don't trust webhook alone).
 */
export async function POST(request: Request) {
  // Verify webhook secret via header
  const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET;
  const headerSecret = request.headers.get("x-portone-webhook-secret");

  if (webhookSecret && headerSecret !== webhookSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const event = body as { tx_id?: string; payment_id?: string; status?: string };
    const paymentId = event.payment_id;

    if (!paymentId) {
      // Not a payment event we handle — acknowledge and ignore
      return Response.json({ success: true });
    }

    // Re-verify by fetching payment from PortOne API
    const payment = await getPayment(paymentId);
    const status = payment.status;

    const supabase = await createServerClient();

    // Extract user ID from payment ID format: order_{userId}_{plan}_{slot} or sub_{subId}_{ts}
    // We match by billing info stored in the subscription

    if (status === "PAID") {
      // Payment succeeded: extend subscription period
      const newPeriodStart = new Date().toISOString();
      const newPeriodEnd = new Date();
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

      // Find subscription by matching payment ID prefix
      // For recurring: paymentId = sub_{subscriptionId}_{ts}
      const subIdMatch = paymentId.match(/^sub_([^_]+)_/);
      if (subIdMatch) {
        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            current_period_start: newPeriodStart,
            current_period_end: newPeriodEnd.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", subIdMatch[1]);
      }
    } else if (status === "CANCELLED") {
      const subIdMatch = paymentId.match(/^sub_([^_]+)_/);
      if (subIdMatch) {
        await supabase
          .from("subscriptions")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", subIdMatch[1]);
      }
    } else if (status === "FAILED") {
      const subIdMatch = paymentId.match(/^sub_([^_]+)_/);
      if (subIdMatch) {
        await supabase
          .from("subscriptions")
          .update({
            status: "payment_failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", subIdMatch[1]);
      }
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("[webhook/portone] Error:", err);
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
