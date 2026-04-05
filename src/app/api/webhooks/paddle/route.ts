import { EventName, Paddle } from "@paddle/paddle-node-sdk";
import { createServerClient } from "@/shared/lib/supabase";
import { planIdFromPriceId } from "@/shared/lib/paddle";

const paddle = new Paddle(process.env.PADDLE_API_KEY!);

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("paddle-signature") ?? "";
  const secret = process.env.PADDLE_WEBHOOK_SECRET;

  if (!secret) {
    console.error("[paddle-webhook] PADDLE_WEBHOOK_SECRET not set");
    return Response.json({ error: "Server misconfigured" }, { status: 500 });
  }

  let event;
  try {
    event = await paddle.webhooks.unmarshal(rawBody, secret, signature);
  } catch (err) {
    console.error("[paddle-webhook] Signature verification failed");
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency: skip already-processed events
  const eventId = (event as { eventId?: string }).eventId;
  if (eventId) {
    const supabase = await createServerClient();
    const { data: existing } = await supabase
      .from("webhook_events")
      .select("id")
      .eq("event_id", eventId)
      .maybeSingle();

    if (existing) {
      console.log(`[paddle-webhook] Event ${eventId} already processed, skipping`);
      return Response.json({ received: true });
    }
  }

  try {
    switch (event.eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionUpdated:
        await handleSubscriptionChange(event.data);
        break;
      case EventName.SubscriptionCanceled:
        await handleSubscriptionCanceled(event.data);
        break;
      default:
        console.log("[paddle-webhook] Unhandled event:", event.eventType);
    }
  } catch (err) {
    console.error("[paddle-webhook] Handler error:", err instanceof Error ? err.message : String(err));
    return Response.json({ error: "Handler failed" }, { status: 500 });
  }

  // Record processed event for idempotency
  if (eventId) {
    try {
      const supabase = await createServerClient();
      await supabase.from("webhook_events").insert({
        event_id: eventId,
        event_type: event.eventType,
        processed_at: new Date().toISOString(),
      });
    } catch {
      // Non-critical: worst case is a duplicate processing on retry
      console.warn("[paddle-webhook] Failed to record event ID for idempotency");
    }
  }

  return Response.json({ received: true });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionChange(data: any) {
  const customData = data.customData as { userId?: string } | null;
  const userId = customData?.userId;
  if (!userId) {
    console.warn("[paddle-webhook] No userId in customData");
    // Return error so Paddle retries (user may not have profile yet)
    throw new Error("No userId in customData");
  }

  const priceId = data.items?.[0]?.price?.id;
  if (!priceId) {
    console.warn("[paddle-webhook] No priceId in items");
    return;
  }

  const plan = planIdFromPriceId(priceId);
  if (!plan) {
    console.warn("[paddle-webhook] Unknown priceId:", priceId);
    return;
  }

  const status = data.status as string;
  // Only upgrade plan for active or trialing subscriptions
  if (status !== "active" && status !== "trialing") {
    console.log("[paddle-webhook] Subscription not active:", status);
    return;
  }

  const supabase = await createServerClient();

  // Update user plan
  const { error, count } = await supabase
    .from("user_profiles")
    .update({
      plan,
      paddle_subscription_id: data.id,
      paddle_customer_id: data.customerId,
    })
    .eq("auth_user_id", userId);

  if (error) {
    console.error("[paddle-webhook] Failed to update plan:", error.message);
    throw error;
  }

  if (count === 0) {
    console.error(`[paddle-webhook] No profile found for userId ${userId}`);
    // Throw so Paddle retries — profile may be created shortly after
    throw new Error(`No profile found for userId ${userId}`);
  }

  console.log(`[paddle-webhook] User ${userId} upgraded to ${plan}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionCanceled(data: any) {
  const subscriptionId = data.id as string;

  const supabase = await createServerClient();

  // Downgrade to free
  const { error, count } = await supabase
    .from("user_profiles")
    .update({ plan: "free" })
    .eq("paddle_subscription_id", subscriptionId);

  if (error) {
    console.error("[paddle-webhook] Failed to downgrade plan:", error.message);
    throw error;
  }

  if (count === 0) {
    // Try fallback: look up by customer ID
    const customerId = data.customerId as string | undefined;
    if (customerId) {
      const { error: fallbackErr } = await supabase
        .from("user_profiles")
        .update({ plan: "free" })
        .eq("paddle_customer_id", customerId);

      if (fallbackErr) {
        console.error("[paddle-webhook] Fallback downgrade failed:", fallbackErr.message);
        throw fallbackErr;
      }
      console.log(`[paddle-webhook] Subscription ${subscriptionId} canceled via customer fallback → free`);
      return;
    }
    console.warn(`[paddle-webhook] No profile found for subscription ${subscriptionId}`);
  }

  console.log(`[paddle-webhook] Subscription ${subscriptionId} canceled → free`);
}
