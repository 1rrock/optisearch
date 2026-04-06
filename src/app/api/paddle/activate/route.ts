import { z } from "zod";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { createServerClient } from "@/shared/lib/supabase";
import { planIdFromPriceId } from "@/shared/lib/paddle";
import { Paddle } from "@paddle/paddle-node-sdk";

const bodySchema = z.object({
  transactionId: z.string().min(1),
});

const paddle = new Paddle(process.env.PADDLE_API_KEY!);

/**
 * Called by frontend after checkout.completed to activate the plan.
 * Verifies the transaction with Paddle API and updates the DB.
 * This is a fallback/complement to the webhook flow.
 */
export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "transactionId가 필요합니다." }, { status: 422 });
  }

  const { transactionId } = parsed.data;

  try {
    // Verify transaction with Paddle API
    const transaction = await paddle.transactions.get(transactionId);

    if (!transaction) {
      return Response.json({ error: "거래를 찾을 수 없습니다." }, { status: 404 });
    }

    // Check transaction status
    const status = transaction.status;
    if (status !== "completed" && status !== "paid") {
      return Response.json({ error: `거래가 완료되지 않았습니다. (${status})` }, { status: 400 });
    }

    // Get price ID and map to plan
    const priceId = transaction.items?.[0]?.price?.id;
    if (!priceId) {
      return Response.json({ error: "가격 정보를 찾을 수 없습니다." }, { status: 400 });
    }

    const plan = planIdFromPriceId(priceId);
    if (!plan) {
      console.error("[paddle/activate] Unknown priceId:", priceId);
      return Response.json({ error: "플랜을 매핑할 수 없습니다." }, { status: 400 });
    }

    // Verify this transaction belongs to the requesting user
    const customData = transaction.customData as { userId?: string } | null;
    if (customData?.userId && customData.userId !== user.userId) {
      // Also check against auth_user_id (session.user.id which is provider-prefixed)
      const supabase = await createServerClient();
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("auth_user_id")
        .eq("id", user.userId)
        .single();

      if (profile?.auth_user_id !== customData.userId) {
        return Response.json({ error: "권한이 없습니다." }, { status: 403 });
      }
    }

    // Get subscription ID from transaction
    const subscriptionId = (transaction as unknown as { subscriptionId?: string }).subscriptionId;

    // Update user plan
    const supabase = await createServerClient();
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        plan,
        ...(subscriptionId ? { paddle_subscription_id: subscriptionId } : {}),
        paddle_customer_id: transaction.customerId ?? null,
      })
      .eq("id", user.userId);

    if (updateError) {
      console.error("[paddle/activate] DB update failed:", updateError.message);
      return Response.json({ error: "플랜 업데이트에 실패했습니다." }, { status: 500 });
    }

    console.log(`[paddle/activate] User ${user.userId} upgraded to ${plan} via transaction ${transactionId}`);

    return Response.json({ success: true, plan });
  } catch (err) {
    console.error("[paddle/activate] Error:", err instanceof Error ? err.message : String(err));
    return Response.json({ error: "플랜 활성화에 실패했습니다." }, { status: 500 });
  }
}
