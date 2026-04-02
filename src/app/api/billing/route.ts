import { z } from "zod";
import { getCurrentUserProfileId } from "@/services/user-service";
import { createSubscription } from "@/services/subscription-service";

const bodySchema = z.object({
  billingKey: z.string().min(1),
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

    await createSubscription({
      userId,
      plan: parsed.data.plan,
      billingKey: parsed.data.billingKey,
      customerKey: parsed.data.customerKey,
    });

    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
