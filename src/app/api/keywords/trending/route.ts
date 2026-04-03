import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { getSearchTrend } from "@/shared/lib/naver-datalab";
import { getKeywordStats } from "@/shared/lib/naver-searchad";
import { getAllTrendingSeeds } from "@/shared/config/trending-seeds";
import { createServerClient } from "@/shared/lib/supabase";
import { cached } from "@/services/cache-service";

export interface TrendingKeywordItem {
  keyword: string;
  volume: number;
  changeRate: number;
  direction: "up" | "down" | "stable";
}

export interface TrendingResponse {
  period: "daily" | "monthly";
  keywords: TrendingKeywordItem[];
}

// 24-hour cache — each cache miss costs ~20 DataLab API calls
// DataLab daily limit: 1,000 calls/day
const CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * GET /api/keywords/trending?period=daily|monthly
 *
 * Calculates keyword velocity by comparing recent DataLab ratio
 * against the prior period:
 * - daily: last 7 days vs previous 7 days
 * - monthly: last month vs previous month
 */
export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get("period") ?? "daily") as "daily" | "monthly";

  if (period !== "daily" && period !== "monthly") {
    return Response.json({ error: "period must be daily or monthly" }, { status: 400 });
  }

  try {
    const result = await cached<TrendingResponse>(
      `trending:${period}`,
      CACHE_TTL,
      () => fetchTrendingData(period, user.userId)
    );
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[trending] error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}

async function fetchTrendingData(
  period: "daily" | "monthly",
  userId: string
): Promise<TrendingResponse> {
  // Combine seed keywords + user's recent search keywords
  const seeds = getAllTrendingSeeds();
  const userKeywords = await getUserRecentKeywords(userId);
  const allKeywords = [...new Set([...seeds, ...userKeywords])];

  // Date ranges
  const now = new Date();
  const timeUnit = period === "daily" ? "date" as const : "month" as const;

  let startDate: string;
  if (period === "daily") {
    // 30 days back for daily comparison
    startDate = formatDate(new Date(now.getTime() - 30 * 86400000));
  } else {
    // 3 months back for monthly comparison
    startDate = formatDate(new Date(now.getFullYear(), now.getMonth() - 3, 1));
  }
  const endDate = formatDate(now);

  // Fetch DataLab trends — one keyword at a time for independent ratios
  // QUOTA OPTIMIZATION: Limit to 20 keywords (= 20 API calls per cache miss)
  // Cache is 24h, so worst case = 40 calls/day (daily + monthly)
  // DataLab daily limit: 1,000 calls/day → well within budget
  const keywordsToQuery = allKeywords.slice(0, 20);
  const velocities: Array<{ keyword: string; changeRate: number }> = [];

  // Process in parallel batches of 5 to respect rate limits
  const PARALLEL = 5;
  for (let i = 0; i < keywordsToQuery.length; i += PARALLEL) {
    const batch = keywordsToQuery.slice(i, i + PARALLEL);
    const results = await Promise.all(
      batch.map((keyword) =>
        getSearchTrend({ keyword, startDate, endDate, timeUnit })
          .then((res) => ({ keyword, data: res.results?.[0]?.data ?? [] }))
          .catch(() => ({ keyword, data: [] as { period: string; ratio: number }[] }))
      )
    );

    for (const { keyword, data } of results) {
      if (data.length < 4) continue; // Not enough data points

      const changeRate = calculateChangeRate(data, period);
      if (changeRate !== null) {
        velocities.push({ keyword, changeRate });
      }
    }
  }

  // Sort by absolute change rate (biggest movers first), prefer "up"
  velocities.sort((a, b) => Math.abs(b.changeRate) - Math.abs(a.changeRate));
  const topKeywords = velocities.slice(0, 15);

  if (topKeywords.length === 0) {
    return { period, keywords: [] };
  }

  // Fetch volumes from SearchAd
  const volumeMap = new Map<string, number>();
  try {
    const stats = await getKeywordStats(topKeywords.map((k) => k.keyword));
    for (const stat of stats) {
      if (topKeywords.some((k) => k.keyword === stat.relKeyword)) {
        volumeMap.set(stat.relKeyword, stat.monthlyPcQcCnt + stat.monthlyMobileQcCnt);
      }
    }
  } catch {
    // Continue without volume data
  }

  const keywords: TrendingKeywordItem[] = topKeywords.map(({ keyword, changeRate }) => ({
    keyword,
    volume: volumeMap.get(keyword) ?? 0,
    changeRate: Math.round(changeRate * 10) / 10,
    direction: changeRate > 5 ? "up" : changeRate < -5 ? "down" : "stable",
  }));

  return { period, keywords };
}

function calculateChangeRate(
  data: Array<{ period: string; ratio: number }>,
  period: "daily" | "monthly"
): number | null {
  if (period === "daily") {
    // Compare last 7 days vs previous 7 days
    const recent = data.slice(-7);
    const previous = data.slice(-14, -7);
    if (recent.length === 0 || previous.length === 0) return null;

    const recentAvg = recent.reduce((s, d) => s + d.ratio, 0) / recent.length;
    const prevAvg = previous.reduce((s, d) => s + d.ratio, 0) / previous.length;
    if (prevAvg === 0) return recentAvg > 0 ? 100 : 0;
    return ((recentAvg - prevAvg) / prevAvg) * 100;
  } else {
    // Compare last month vs previous month
    const recent = data.slice(-1);
    const previous = data.slice(-2, -1);
    if (recent.length === 0 || previous.length === 0) return null;

    const recentRatio = recent[0].ratio;
    const prevRatio = previous[0].ratio;
    if (prevRatio === 0) return recentRatio > 0 ? 100 : 0;
    return ((recentRatio - prevRatio) / prevRatio) * 100;
  }
}

async function getUserRecentKeywords(userId: string): Promise<string[]> {
  try {
    const supabase = await createServerClient();
    const { data } = await supabase
      .from("keyword_searches")
      .select("keyword")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!data) return [];
    // Deduplicate
    return [...new Set(data.map((row) => row.keyword))];
  } catch {
    return [];
  }
}

function formatDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
