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
    console.error("[paddle-webhook] Signature verification failed:", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
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
    console.error("[paddle-webhook] Handler error:", err);
    return Response.json({ error: "Handler failed" }, { status: 500 });
  }

  return Response.json({ received: true });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionChange(data: any) {
  const customData = data.customData as { userId?: string } | null;
  const userId = customData?.userId;
  if (!userId) {
    console.warn("[paddle-webhook] No userId in customData");
    return;
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
  const { error } = await supabase
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

  console.log(`[paddle-webhook] User ${userId} upgraded to ${plan}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionCanceled(data: any) {
  const subscriptionId = data.id as string;

  const supabase = await createServerClient();

  // Downgrade to free
  const { error } = await supabase
    .from("user_profiles")
    .update({ plan: "free" })
    .eq("paddle_subscription_id", subscriptionId);

  if (error) {
    console.error("[paddle-webhook] Failed to downgrade plan:", error.message);
    throw error;
  }

  console.log(`[paddle-webhook] Subscription ${subscriptionId} canceled → free`);
}
