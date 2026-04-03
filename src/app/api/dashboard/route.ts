import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { createServerClient } from "@/shared/lib/supabase";

const EMPTY_DASHBOARD = {
  plan: "free" as const,
  usage: { search: 0, title: 0, draft: 0, score: 0 },
  recentSearches: [],
  savedKeywordsCount: 0,
  totalSearches: 0,
};

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { userId, plan } = user;
    const supabase = await createServerClient();

    // Get today's usage counts
    const today = new Date().toISOString().split("T")[0];
    const { data: usageData } = await supabase
      .from("ai_usage")
      .select("feature")
      .eq("user_id", userId)
      .gte("created_at", `${today}T00:00:00`);

    const usage = { search: 0, title: 0, draft: 0, score: 0 };
    for (const row of usageData ?? []) {
      if (row.feature in usage) {
        usage[row.feature as keyof typeof usage]++;
      }
    }

    // Get recent searches (last 5)
    const { data: recentSearches } = await supabase
      .from("keyword_searches")
      .select("keyword, keyword_grade, pc_search_volume, mobile_search_volume, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Get saved keywords count
    const { count: savedCount } = await supabase
      .from("saved_keywords")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    // Get total searches count
    const { count: totalSearches } = await supabase
      .from("keyword_searches")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    return Response.json({
      plan,
      usage,
      recentSearches: (recentSearches ?? []).map((s) => ({
        keyword: s.keyword,
        grade: s.keyword_grade,
        totalVolume: (s.pc_search_volume ?? 0) + (s.mobile_search_volume ?? 0),
        createdAt: s.created_at,
      })),
      savedKeywordsCount: savedCount ?? 0,
      totalSearches: totalSearches ?? 0,
    });
  } catch (err) {
    console.error("[api/dashboard] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
