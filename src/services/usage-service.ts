import { createServerClient } from "@/shared/lib/supabase";
import { PLAN_LIMITS, type PlanId } from "@/shared/config/constants";

type FeatureKey = "search" | "title" | "draft" | "score";

/**
 * Get today's date string in KST (UTC+9) for daily reset.
 */
function getTodayKST(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().split("T")[0];
}

/**
 * Check if the user has remaining usage for a feature today.
 * Read-only check — use for UI display, NOT for enforcement.
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
  const today = getTodayKST();

  const { count, error } = await supabase
    .from("ai_usage")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("feature", feature)
    .gte("created_at", `${today}T00:00:00`)
    .lte("created_at", `${today}T23:59:59`);

  if (error) {
    console.error("[checkUsageLimit] Supabase error:", error.message);
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

/**
 * Atomic record-and-enforce: Insert usage row first, then check count.
 * If over limit, delete the inserted row and return denial.
 * This prevents TOCTOU race conditions where concurrent requests all pass the check.
 *
 * Returns null if allowed (usage recorded), or { used, limit } if denied (row rolled back).
 */
export async function recordAndEnforce(
  userId: string,
  plan: PlanId,
  feature: FeatureKey,
  keyword?: string
): Promise<{ allowed: true; used: number; limit: number } | { allowed: false; used: number; limit: number }> {
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
  const today = getTodayKST();

  // Step 1: Insert usage row first (optimistic)
  const { data: inserted, error: insertError } = await supabase
    .from("ai_usage")
    .insert({
      user_id: userId,
      feature,
      keyword: keyword ?? null,
      tokens_used: 0,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[recordAndEnforce] insert failed:", insertError?.message);
    // Fail closed
    return { allowed: false, used: limit, limit };
  }

  // Step 2: Count total usage for today (including the row we just inserted)
  const { count, error: countError } = await supabase
    .from("ai_usage")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("feature", feature)
    .gte("created_at", `${today}T00:00:00`)
    .lte("created_at", `${today}T23:59:59`);

  if (countError) {
    console.error("[recordAndEnforce] count failed:", countError.message);
    // Fail closed: rollback the inserted row
    await supabase.from("ai_usage").delete().eq("id", inserted.id);
    return { allowed: false, used: limit, limit };
  }

  const used = count ?? 0;

  // Step 3: If over limit, rollback the inserted row
  if (used > limit) {
    await supabase.from("ai_usage").delete().eq("id", inserted.id);
    return { allowed: false, used: used - 1, limit };
  }

  return { allowed: true, used, limit };
}
