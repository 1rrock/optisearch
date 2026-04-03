import { z } from "zod";
import { getCurrentUserProfileId } from "@/services/user-service";
import { createSubscription } from "@/services/subscription-service";
import { issueBillingKey, chargeBillingKey } from "@/shared/lib/toss-payments";
import { PLAN_PRICING } from "@/shared/config/constants";

const bodySchema = z.object({
  authKey: z.string().min(1),
  customerKey: z.string().min(1),
  plan: z.enum(["basic", "pro"]),
  /** Client-generated idempotency key to prevent duplicate charges on retry */
  idempotencyKey: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserProfileId();
    if (!userId) {
      return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Validation failed" }, { status: 422 });
    }

    const { authKey, customerKey, plan, idempotencyKey } = parsed.data;

    // Use client-provided idempotency key or generate a deterministic one
    // Deterministic: same user + plan + minute = same orderId (prevents rapid retries)
    const minuteSlot = Math.floor(Date.now() / 60000);
    const orderId = idempotencyKey ?? `order_${userId}_${plan}_${minuteSlot}`;

    // Issue billing key from authKey (Toss server-to-server call)
    const { billingKey } = await issueBillingKey({ authKey, customerKey });

    // Charge the first payment immediately
    const pricing = PLAN_PRICING[plan];
    await chargeBillingKey({
      billingKey,
      customerKey,
      amount: pricing.monthly,
      orderId,
      orderName: `옵티써치 ${pricing.label} 구독`,
    });

    // Persist subscription in Supabase
    await createSubscription({
      userId,
      plan,
      billingKey,
      customerKey,
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("[api/billing] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
