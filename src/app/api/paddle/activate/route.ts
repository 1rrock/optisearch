import { z } from "zod";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { createServerClient } from "@/shared/lib/supabase";
import { planIdFromPriceId } from "@/shared/lib/paddle";

const bodySchema = z.object({
  transactionId: z.string().min(1),
});

/**
 * Called by frontend after checkout.completed to activate the plan.
 * Verifies the transaction with Paddle API and updates the DB.
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
    const apiKey = process.env.PADDLE_API_KEY;
    if (!apiKey) {
      console.error("[paddle/activate] PADDLE_API_KEY not set");
      return Response.json({ error: "서버 설정 오류" }, { status: 500 });
    }

    const paddleEnv = process.env.NEXT_PUBLIC_PADDLE_ENV ?? "sandbox";
    const baseUrl = paddleEnv === "production"
      ? "https://api.paddle.com"
      : "https://sandbox-api.paddle.com";

    const txRes = await fetch(`${baseUrl}/transactions/${transactionId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!txRes.ok) {
      const errBody = await txRes.text();
      console.error("[paddle/activate] Paddle API error:", txRes.status, errBody);
      return Response.json({ error: "거래를 확인할 수 없습니다.", debug: { status: txRes.status } }, { status: 400 });
    }

    const txData = await txRes.json();
    const transaction = txData.data;

    console.log("[paddle/activate] Transaction:", JSON.stringify({
      id: transaction.id,
      status: transaction.status,
      items: transaction.items?.map((i: any) => ({ priceId: i.price?.id })),
      customData: transaction.custom_data,
      customerId: transaction.customer_id,
      subscriptionId: transaction.subscription_id,
    }));

    // Accept any successful status
    const status = transaction.status;
    if (!["completed", "paid", "billed"].includes(status)) {
      return Response.json({ error: `거래가 완료되지 않았습니다. (${status})`, debug: { status } }, { status: 400 });
    }

    // Get price ID and map to plan
    const priceId = transaction.items?.[0]?.price?.id;
    if (!priceId) {
      return Response.json({ error: "가격 정보를 찾을 수 없습니다.", debug: { items: transaction.items } }, { status: 400 });
    }

    const plan = planIdFromPriceId(priceId);
    if (!plan) {
      console.error("[paddle/activate] Unknown priceId:", priceId,
        "| env BASIC:", process.env.NEXT_PUBLIC_PADDLE_PRICE_BASIC ?? process.env.PADDLE_PRICE_BASIC ?? "NOT SET",
        "| env PRO:", process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO ?? process.env.PADDLE_PRICE_PRO ?? "NOT SET");
      return Response.json({ error: "플랜을 매핑할 수 없습니다.", debug: { priceId } }, { status: 400 });
    }

    // Update user plan (use profile UUID directly)
    const supabase = await createServerClient();

    const updateData: Record<string, string> = { plan };
    if (transaction.subscription_id) {
      updateData.paddle_subscription_id = transaction.subscription_id;
    }
    if (transaction.customer_id) {
      updateData.paddle_customer_id = transaction.customer_id;
    }

    const { error: updateError, count } = await supabase
      .from("user_profiles")
      .update(updateData, { count: "exact" })
      .eq("id", user.userId);

    if (updateError) {
      console.error("[paddle/activate] DB update failed:", updateError.message, updateError);
      // Try without paddle columns in case they don't exist
      const { error: retryError } = await supabase
        .from("user_profiles")
        .update({ plan })
        .eq("id", user.userId);

      if (retryError) {
        console.error("[paddle/activate] Retry failed:", retryError.message);
        return Response.json({ error: "플랜 업데이트에 실패했습니다.", debug: { error: retryError.message } }, { status: 500 });
      }
    }

    console.log(`[paddle/activate] User ${user.userId} upgraded to ${plan} (count: ${count})`);

    return Response.json({ success: true, plan });
  } catch (err) {
    console.error("[paddle/activate] Error:", err instanceof Error ? err.message : String(err));
    return Response.json({ error: "플랜 활성화에 실패했습니다.", debug: { message: err instanceof Error ? err.message : String(err) } }, { status: 500 });
  }
}
