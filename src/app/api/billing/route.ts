import { z } from "zod";
import { getCurrentUserProfileId } from "@/services/user-service";
import { createSubscription } from "@/services/subscription-service";
import { issueBillingKey, chargeBillingKey } from "@/shared/lib/toss-payments";
import { PLAN_PRICING } from "@/shared/config/constants";

const bodySchema = z.object({
  authKey: z.string().min(1),
  customerKey: z.string().min(1),
  plan: z.enum(["basic", "pro"]),
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

    const { authKey, customerKey, plan } = parsed.data;

    // Issue billing key from authKey (Toss server-to-server call)
    const { billingKey } = await issueBillingKey({ authKey, customerKey });

    // Charge the first payment immediately
    const pricing = PLAN_PRICING[plan];
    const orderId = `order_${userId}_${Date.now()}`;
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
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
