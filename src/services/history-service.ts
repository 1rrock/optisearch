import { createServerClient } from "@/shared/lib/supabase";
import type { KeywordSearchResult } from "@/entities/keyword/model/types";

/**
 * Save a keyword search result to the database.
 * Requires the user's profile ID (from user_profiles table).
 */
export async function saveSearchHistory(
  userId: string,
  result: KeywordSearchResult
): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase.from("keyword_searches").insert({
    user_id: userId,
    keyword: result.keyword,
    pc_search_volume: result.pcSearchVolume,
    mobile_search_volume: result.mobileSearchVolume,
    competition: result.competition,
    blog_post_count: result.blogPostCount,
    keyword_grade: result.keywordGrade,
    composite_score: result.saturationIndex?.score ?? null,
  });

  if (error) {
    throw new Error(`Failed to save search history: ${error.message}`);
  }
}

/**
 * Get recent search history for a user, ordered by most recent first.
 */
export async function getSearchHistory(
  userId: string,
  limit: number = 20
): Promise<Array<{
  id: string;
  keyword: string;
  keywordGrade: string;
  pcSearchVolume: number;
  mobileSearchVolume: number;
  totalSearchVolume: number;
  competition: string;
  createdAt: string;
}>> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("keyword_searches")
    .select("id, keyword, keyword_grade, pc_search_volume, mobile_search_volume, competition, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch search history: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    keyword: row.keyword,
    keywordGrade: row.keyword_grade,
    pcSearchVolume: row.pc_search_volume ?? 0,
    mobileSearchVolume: row.mobile_search_volume ?? 0,
    totalSearchVolume: (row.pc_search_volume ?? 0) + (row.mobile_search_volume ?? 0),
    competition: row.competition,
    createdAt: row.created_at,
  }));
}

/**
 * Delete a search history entry.
 */
export async function deleteSearchHistory(
  userId: string,
  historyId: string
): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("keyword_searches")
    .delete()
    .eq("id", historyId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to delete search history: ${error.message}`);
  }
}
