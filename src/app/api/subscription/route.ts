import { Paddle } from "@paddle/paddle-node-sdk";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { createServerClient } from "@/shared/lib/supabase";

const paddle = new Paddle(process.env.PADDLE_API_KEY!);

/**
 * GET /api/subscription — Get current subscription info
 */
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("plan, paddle_subscription_id, paddle_customer_id")
    .eq("id", user.userId)
    .single();

  if (!profile) {
    return Response.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });
  }

  // If no subscription, return basic info
  if (!profile.paddle_subscription_id) {
    return Response.json({
      plan: profile.plan,
      subscriptionId: null,
      status: null,
      nextBillingDate: null,
    });
  }

  // Fetch subscription details from Paddle
  try {
    const subscription = await paddle.subscriptions.get(profile.paddle_subscription_id);
    return Response.json({
      plan: profile.plan,
      subscriptionId: subscription.id,
      status: subscription.status,
      nextBillingDate: subscription.nextBilledAt ?? null,
      scheduledChange: subscription.scheduledChange ?? null,
    });
  } catch (err) {
    console.error("[api/subscription] Paddle fetch error:", err instanceof Error ? err.message : String(err));
    return Response.json({ error: "구독 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
}

/**
 * DELETE /api/subscription — Cancel subscription (effective at end of billing period)
 */
export async function DELETE() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("paddle_subscription_id")
    .eq("id", user.userId)
    .single();

  if (!profile?.paddle_subscription_id) {
    return Response.json({ error: "활성 구독이 없습니다." }, { status: 400 });
  }

  try {
    // Cancel at end of billing period (effectiveFrom defaults to "next_billing_period")
    const result = await paddle.subscriptions.cancel(profile.paddle_subscription_id, {
      effectiveFrom: "next_billing_period",
    });

    return Response.json({
      message: "구독이 취소 예약되었습니다. 현재 결제 기간이 끝나면 무료 플랜으로 전환됩니다.",
      scheduledChange: result.scheduledChange,
    });
  } catch (err) {
    console.error("[api/subscription] Cancel error:", err instanceof Error ? err.message : String(err));
    return Response.json(
      {
        error: "구독 취소에 실패했습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 500 },
    );
  }
}
