import { auth } from "@/auth";
import { checkUsageLimit, recordUsage } from "@/services/usage-service";
import type { PlanId } from "@/shared/config/constants";
import { getKstDateString } from "@/shared/lib/payapp-time";

export { recordUsage };

/**
 * Get the authenticated user's ID and plan. Returns null if not authenticated.
 * Always returns the profile UUID — never the raw auth provider string.
 */
export async function getAuthenticatedUser(): Promise<{ userId: string; plan: PlanId } | null> {
  // Dev bypass — use pre-created dev profile from DB (production에서는 절대 활성화 금지)
  if (process.env.DEV_AUTH_BYPASS === "true" && process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { DEV_USER } = await import("@/shared/lib/dev-auth");
    try {
      const { createServerClient } = await import("@/shared/lib/supabase");
      const supabase = await createServerClient();

      // Ensure public.users row exists (FK target for user_profiles.auth_user_id)
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("id", DEV_USER.authId)
        .single();

      if (!existingUser) {
        await supabase.from("users").insert({
          id: DEV_USER.authId,
          name: DEV_USER.name,
          email: DEV_USER.email,
        });
      }

      // Ensure user_profiles row exists
      const { data: existingProfile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("id", DEV_USER.profileId)
        .single();

      if (!existingProfile) {
        await supabase.from("user_profiles").insert({
          id: DEV_USER.profileId,
          auth_user_id: DEV_USER.authId,
          name: DEV_USER.name,
          email: DEV_USER.email,
        });
      }
    } catch {
      // DB setup failed — still return the profile ID
    }
    return { userId: DEV_USER.profileId, plan: "pro" as PlanId };
  }

  const session = await auth();
  const authUserId = session?.user?.id;
  if (!authUserId) return null;

  try {
    const { createServerClient } = await import("@/shared/lib/supabase");
    const supabase = await createServerClient();

    // Try to find existing profile
    let { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("auth_user_id", authUserId)
      .single();

    // Auto-create if not found
    if (!profile) {
      const { getCurrentUserProfileId } = await import("@/services/user-service");
      const profileId = await getCurrentUserProfileId();
      if (profileId) {
        const { data: newProfile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("id", profileId)
          .single();
        profile = newProfile;
      }
    }

    if (!profile) return null;

    // Fetch active subscription for the plan
    // Also includes stopped subscriptions still within their paid period
    const today = getKstDateString();
    const { data: activeSub } = await supabase
      .from("subscriptions")
      .select("plan, status, current_period_end")
      .eq("user_id", profile.id)
      .or(`status.eq.active,status.eq.pending_billing,and(status.eq.pending_cancel,current_period_end.gte.${today}),and(status.eq.stopped,current_period_end.gte.${today})`)
      .order("status", { ascending: true }) // 'active' sorts before 'stopped'
      .limit(1)
      .maybeSingle();

    const plan = (activeSub?.plan as PlanId) ?? "free";

    return { userId: profile.id, plan };
  } catch (err) {
    console.error("[getAuthenticatedUser] Error:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Check usage limit and return error response if exceeded.
 * Returns null if allowed.
 */
export async function enforceUsageLimit(
  userId: string,
  plan: PlanId,
  feature: "search" | "analyze" | "draft"
): Promise<Response | null> {
  const { allowed, used, limit } = await checkUsageLimit(userId, plan, feature);
  if (!allowed) {
    return Response.json(
      { error: `일일 사용 한도를 초과했습니다. (${used}/${limit})`, code: "USAGE_LIMIT_EXCEEDED", used, limit },
      { status: 429 }
    );
  }
  return null;
}
