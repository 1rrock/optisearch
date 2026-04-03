import { z } from "zod";
import { getCurrentUserProfileId } from "@/services/user-service";
import { createSubscription } from "@/services/subscription-service";
import { chargeByBillingKey } from "@/shared/lib/portone";
import { PLAN_PRICING } from "@/shared/config/constants";

const bodySchema = z.object({
  billingKey: z.string().min(1),
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

    const { billingKey, plan } = parsed.data;

    // Deterministic payment ID: same user + plan + minute = prevents rapid retries
    const minuteSlot = Math.floor(Date.now() / 60000);
    const paymentId = `order_${userId}_${plan}_${minuteSlot}`;

    // Charge the first payment immediately
    const pricing = PLAN_PRICING[plan];
    await chargeByBillingKey({
      billingKey,
      paymentId,
      amount: pricing.monthly,
      orderName: `옵티써치 ${pricing.label} 구독`,
      customerId: userId,
    });

    // Persist subscription in Supabase
    await createSubscription({
      userId,
      plan,
      billingKey,
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("[api/billing] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
