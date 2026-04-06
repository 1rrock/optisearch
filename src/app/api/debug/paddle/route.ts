import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { auth } from "@/auth";
import { createServerClient } from "@/shared/lib/supabase";
import { planIdFromPriceId } from "@/shared/lib/paddle";

export async function GET() {
  try {
    const session = await auth();
    const user = await getAuthenticatedUser();
    const supabase = await createServerClient();

    // Get session user ID (what gets sent to Paddle as customData.userId)
    const sessionUserId = session?.user?.id;

    // Get profile
    let profile = null;
    if (sessionUserId) {
      const { data } = await supabase
        .from("user_profiles")
        .select("id, auth_user_id, plan, paddle_subscription_id, paddle_customer_id")
        .eq("auth_user_id", sessionUserId)
        .single();
      profile = data;
    }

    // Check env vars
    const envCheck = {
      PADDLE_API_KEY: !!process.env.PADDLE_API_KEY,
      PADDLE_WEBHOOK_SECRET: !!process.env.PADDLE_WEBHOOK_SECRET,
      NEXT_PUBLIC_PADDLE_PRICE_BASIC: process.env.NEXT_PUBLIC_PADDLE_PRICE_BASIC ?? "NOT SET",
      NEXT_PUBLIC_PADDLE_PRICE_PRO: process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO ?? "NOT SET",
      PADDLE_PRICE_BASIC: process.env.PADDLE_PRICE_BASIC ?? "NOT SET",
      PADDLE_PRICE_PRO: process.env.PADDLE_PRICE_PRO ?? "NOT SET",
    };

    // Test planIdFromPriceId
    const testBasic = planIdFromPriceId(process.env.NEXT_PUBLIC_PADDLE_PRICE_BASIC ?? "");
    const testPro = planIdFromPriceId(process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO ?? "");

    // Check webhook_events table
    const { data: recentEvents } = await supabase
      .from("webhook_events")
      .select("*")
      .order("processed_at", { ascending: false })
      .limit(5);

    return Response.json({
      sessionUserId,
      userFromHelper: user,
      profile,
      envCheck,
      priceMapping: { basic: testBasic, pro: testPro },
      recentWebhookEvents: recentEvents,
    });
  } catch (err) {
    return Response.json({
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
