import { createServerClient } from "@/shared/lib/supabase";

export interface SavedKeyword {
  id: string;
  keyword: string;
  memo: string | null;
  createdAt: string;
  analysisData?: Record<string, unknown> | null;
  analysisUpdatedAt?: string | null;
}

/**
 * Get all saved keywords for a user, ordered by most recently saved first.
 */
export async function getSavedKeywords(
  userId: string,
  limit: number = 50
): Promise<SavedKeyword[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("saved_keywords")
    .select("id, keyword, memo, created_at, analysis_data, analysis_updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch saved keywords: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    keyword: row.keyword,
    memo: row.memo ?? null,
    createdAt: row.created_at,
    analysisData: row.analysis_data ?? null,
    analysisUpdatedAt: row.analysis_updated_at ?? null,
  }));
}

/**
 * Get cached analysis data for a saved keyword.
 */
export async function getAnalysisData(
  userId: string,
  keyword: string
): Promise<{ analysisData: Record<string, unknown>; analysisUpdatedAt: string } | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("saved_keywords")
    .select("analysis_data, analysis_updated_at")
    .eq("user_id", userId)
    .eq("keyword", keyword)
    .single();

  if (error || !data || !data.analysis_data) return null;

  return {
    analysisData: data.analysis_data as Record<string, unknown>,
    analysisUpdatedAt: data.analysis_updated_at as string,
  };
}

/**
 * Persist analysis data for a saved keyword. Fire-and-forget.
 */
export async function updateAnalysisData(
  userId: string,
  keyword: string,
  analysisData: Record<string, unknown>
): Promise<void> {
  const supabase = await createServerClient();
  await supabase
    .from("saved_keywords")
    .update({
      analysis_data: analysisData,
      analysis_updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("keyword", keyword);
  // fire-and-forget: errors are intentionally ignored
}

/**
 * Save a keyword for a user. Upserts to handle duplicates gracefully.
 */
export async function saveKeyword(
  userId: string,
  keyword: string,
  memo?: string
): Promise<SavedKeyword> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("saved_keywords")
    .upsert(
      { user_id: userId, keyword, memo: memo ?? null },
      { onConflict: "user_id,keyword" }
    )
    .select("id, keyword, memo, created_at")
    .single();

  if (error) {
    throw new Error(`Failed to save keyword: ${error.message}`);
  }

  return {
    id: data.id,
    keyword: data.keyword,
    memo: data.memo ?? null,
    createdAt: data.created_at,
  };
}

/**
 * Remove a saved keyword for a user.
 */
export async function unsaveKeyword(
  userId: string,
  keyword: string
): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("saved_keywords")
    .delete()
    .eq("user_id", userId)
    .eq("keyword", keyword);

  if (error) {
    throw new Error(`Failed to unsave keyword: ${error.message}`);
  }
}

/**
 * Check whether a keyword is saved by a user.
 */
export async function isKeywordSaved(
  userId: string,
  keyword: string
): Promise<boolean> {
  const supabase = await createServerClient();
  const { count, error } = await supabase
    .from("saved_keywords")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("keyword", keyword);

  if (error) {
    throw new Error(`Failed to check saved keyword: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

/**
 * Count how many keywords a user has saved.
 */
export async function countSavedKeywords(userId: string): Promise<number> {
  const supabase = await createServerClient();
  const { count, error } = await supabase
    .from("saved_keywords")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to count saved keywords: ${error.message}`);
  }

  return count ?? 0;
}
