import { auth } from "@/auth";
import { checkUsageLimit, recordUsage } from "@/services/usage-service";
import type { PlanId } from "@/shared/config/constants";

export { recordUsage };

/**
 * Get the authenticated user's ID and plan. Returns null if not authenticated.
 * Falls back gracefully if Supabase tables don't exist yet.
 */
export async function getAuthenticatedUser(): Promise<{ userId: string; plan: PlanId } | null> {
  // Dev bypass
  if (process.env.DEV_AUTH_BYPASS === "true") {
    return { userId: "dev-test-user-001", plan: "pro" as PlanId };
  }

  const session = await auth();
  const authUserId = session?.user?.id;
  if (!authUserId) return null;

  // Try to get plan from user_profiles, but fall back to "free" if DB isn't set up
  try {
    const { createServerClient } = await import("@/shared/lib/supabase");
    const supabase = await createServerClient();
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id, plan")
      .eq("auth_user_id", authUserId)
      .single();

    return { userId: profile?.id ?? authUserId, plan: (profile?.plan as PlanId) ?? "free" };
  } catch {
    // DB not available — use auth user ID directly with free plan
    return { userId: authUserId, plan: "free" };
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
