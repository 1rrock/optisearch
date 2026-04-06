import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { createServerClient } from "@/shared/lib/supabase";
import { getDatalabQuotaUsage } from "@/shared/lib/naver-datalab";
import { PLAN_LIMITS } from "@/shared/config/constants";

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

    // Parallel DB queries for speed (was sequential ~3.1s → ~600ms)
    const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().split("T")[0];

    const [
      { data: usageData },
      { data: recentSearches },
      { count: savedCount },
      { count: totalSearches },
      quotaUsage,
    ] = await Promise.all([
      supabase.from("ai_usage").select("feature").eq("user_id", userId).gte("created_at", `${today}T00:00:00`),
      supabase.from("keyword_searches").select("keyword, keyword_grade, pc_search_volume, mobile_search_volume, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
      supabase.from("saved_keywords").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("keyword_searches").select("*", { count: "exact", head: true }).eq("user_id", userId),
      getDatalabQuotaUsage(),
    ]);

    const usage = { search: 0, title: 0, draft: 0, score: 0 };
    for (const row of usageData ?? []) {
      if (row.feature in usage) {
        usage[row.feature as keyof typeof usage]++;
      }
    }

    const limits = PLAN_LIMITS[plan];

    return Response.json({
      plan,
      usage,
      limits: {
        dailySearch: limits.dailySearch,
        dailyTitle: limits.dailyTitle,
        dailyDraft: limits.dailyDraft,
        dailyScore: limits.dailyScore,
      },
      recentSearches: (recentSearches ?? []).map((s) => ({
        keyword: s.keyword,
        grade: s.keyword_grade,
        totalVolume: (s.pc_search_volume ?? 0) + (s.mobile_search_volume ?? 0),
        createdAt: s.created_at,
      })),
      savedKeywordsCount: savedCount ?? 0,
      totalSearches: totalSearches ?? 0,
      datalabQuota: {
        used: quotaUsage.count,
        limit: quotaUsage.limit,
        remaining: quotaUsage.limit - quotaUsage.count,
      },
    });
  } catch (err) {
    console.error("[api/dashboard] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
