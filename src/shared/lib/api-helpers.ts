import { auth } from "@/auth";
import { checkUsageLimit, recordUsage } from "@/services/usage-service";
import type { PlanId } from "@/shared/config/constants";

export { recordUsage };

/**
 * Get the authenticated user's ID and plan. Returns null if not authenticated.
 * Always returns the profile UUID — never the raw auth provider string.
 */
export async function getAuthenticatedUser(): Promise<{ userId: string; plan: PlanId } | null> {
  // Dev bypass — ensure dev profile exists in DB
  if (process.env.DEV_AUTH_BYPASS === "true") {
    const { DEV_USER } = await import("@/shared/lib/dev-auth");
    try {
      const { createServerClient } = await import("@/shared/lib/supabase");
      const supabase = await createServerClient();

      // Check if dev profile already exists
      const { data: existing } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("id", DEV_USER.id)
        .single();

      if (!existing) {
        // Insert dev profile — use insert to handle all constraint types
        const { error } = await supabase.from("user_profiles").insert({
          id: DEV_USER.id,
          auth_user_id: DEV_USER.id,
          name: DEV_USER.name,
          email: DEV_USER.email,
          plan: "pro",
        });
        if (error) {
          console.error("[dev-auth] Failed to create dev profile:", error.message);
        }
      }
    } catch (err) {
      console.error("[dev-auth] Dev profile setup error:", err);
    }
    return { userId: DEV_USER.id, plan: "pro" as PlanId };
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
      .select("id, plan")
      .eq("auth_user_id", authUserId)
      .single();

    // Auto-create if not found
    if (!profile) {
      const { getCurrentUserProfileId } = await import("@/services/user-service");
      const profileId = await getCurrentUserProfileId();
      if (profileId) {
        const { data: newProfile } = await supabase
          .from("user_profiles")
          .select("id, plan")
          .eq("id", profileId)
          .single();
        profile = newProfile;
      }
    }

    if (!profile) return null;

    return { userId: profile.id, plan: (profile.plan as PlanId) ?? "free" };
  } catch {
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
  feature: "search" | "title" | "draft" | "score"
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
