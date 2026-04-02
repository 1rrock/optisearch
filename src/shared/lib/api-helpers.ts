import { auth } from "@/auth";
import { checkUsageLimit, recordUsage } from "@/services/usage-service";
import type { PlanId } from "@/shared/config/constants";

export { recordUsage };

/**
 * Get the authenticated user's ID and plan. Returns null if not authenticated.
 * Always returns the profile UUID — never the raw auth provider string.
 */
export async function getAuthenticatedUser(): Promise<{ userId: string; plan: PlanId } | null> {
  // Dev bypass
  if (process.env.DEV_AUTH_BYPASS === "true") {
    return { userId: "dev-test-user-001", plan: "pro" as PlanId };
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

    if (!profile) return null; // Cannot create profile — treat as unauthenticated

    return { userId: profile.id, plan: (profile.plan as PlanId) ?? "free" };
  } catch {
    return null; // DB error — do not fall back to auth string
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
      { error: `일일 사용 한도를 초과했습니다. (${used}/${limit})`, code: "USAGE_LIMIT_EXCEEDED" },
      { status: 429 }
    );
  }
  return null;
}
