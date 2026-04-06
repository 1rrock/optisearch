import { createServerClient } from "@/shared/lib/supabase";
import { PLAN_LIMITS, type PlanId } from "@/shared/config/constants";

type FeatureKey = "search" | "title" | "draft" | "score";

/**
 * Check if the user has remaining usage for a feature today.
 */
export async function checkUsageLimit(
  userId: string,
  plan: PlanId,
  feature: FeatureKey
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const limits = PLAN_LIMITS[plan];
  const dailyLimitMap: Record<FeatureKey, number> = {
    search: limits.dailySearch,
    title: limits.dailyTitle,
    draft: limits.dailyDraft,
    score: limits.dailyScore,
  };

  const limit = dailyLimitMap[feature];
  if (limit === -1) return { allowed: true, used: 0, limit: -1 };

  const supabase = await createServerClient();
  // Use KST (UTC+9) for daily reset so Korean users see midnight reset
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().split("T")[0];

  const { count, error } = await supabase
    .from("ai_usage")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("feature", feature)
    .gte("created_at", `${today}T00:00:00`)
    .lte("created_at", `${today}T23:59:59`);

  if (error) {
    console.error("[checkUsageLimit] Supabase error:", error.message);
    // Fail closed: deny on DB error to prevent unlimited usage
    return { allowed: false, used: limit, limit };
  }

  const used = count ?? 0;
  return { allowed: used < limit, used, limit };
}

/**
 * Record a usage event.
 */
export async function recordUsage(
  userId: string,
  feature: FeatureKey,
  keyword?: string,
  tokensUsed?: number
): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase.from("ai_usage").insert({
    user_id: userId,
    feature,
    keyword: keyword ?? null,
    tokens_used: tokensUsed ?? 0,
  });
  if (error) {
    console.error("[recordUsage] insert failed:", error.message);
  }
}
