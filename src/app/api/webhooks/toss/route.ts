import { createServerClient } from "@/shared/lib/supabase";

export async function POST(request: Request) {
  // Verify authorization: Toss signs webhooks with the same Basic auth as API calls
  const authHeader = request.headers.get("authorization");
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    return Response.json({ error: "Server configuration error" }, { status: 500 });
  }

  const expectedAuth = "Basic " + Buffer.from(secretKey + ":").toString("base64");
  if (authHeader !== expectedAuth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const event = body as Record<string, unknown>;
    // Toss webhook shape: { eventType, createdAt, data: { status, billingKey, orderId, ... } }
    const data = (event.data ?? {}) as Record<string, unknown>;
    const status = (data.status ?? event.status) as string | undefined;
    const billingKey = (data.billingKey ?? event.billingKey) as string | undefined;

    if (!status || !billingKey) {
      // Not a payment event we handle — acknowledge and ignore
      return Response.json({ success: true });
    }

    const supabase = await createServerClient();

    if (status === "DONE") {
      // Payment succeeded: mark subscription active and extend period
      const newPeriodStart = new Date().toISOString();
      const newPeriodEnd = new Date();
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

      await supabase
        .from("subscriptions")
        .update({
          status: "active",
          current_period_start: newPeriodStart,
          current_period_end: newPeriodEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("toss_billing_key", billingKey);
    } else if (status === "CANCELED" || status === "ABORTED") {
      await supabase
        .from("subscriptions")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("toss_billing_key", billingKey);
    } else if (status === "EXPIRED") {
      await supabase
        .from("subscriptions")
        .update({
          status: "expired",
          updated_at: new Date().toISOString(),
        })
        .eq("toss_billing_key", billingKey);
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
