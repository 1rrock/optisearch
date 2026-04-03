import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { getSearchTrendBatch } from "@/shared/lib/naver-datalab";
import { getKeywordStats } from "@/shared/lib/naver-searchad";
import { getAllTrendingSeeds } from "@/shared/config/trending-seeds";
import { cached } from "@/services/cache-service";
import { formatDate } from "@/shared/lib/utils";

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
      () => fetchTrendingData(period)
    );
    return Response.json(result);
  } catch (err) {
    console.error("[api/keywords/trending] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

async function fetchTrendingData(
  period: "daily" | "monthly"
): Promise<TrendingResponse> {
  // Use only seed keywords for trending (not user-specific)
  // User keywords are excluded to prevent cache pollution across users
  // (cache key is shared: `trending:${period}`)
  const allKeywords = getAllTrendingSeeds();

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

  // Fetch DataLab trends — batch 5 keywords per API call (80% quota savings)
  // QUOTA OPTIMIZATION: 20 keywords = 4 API calls (was 20)
  // Cache is 24h, so worst case = 8 calls/day (daily + monthly)
  const keywordsToQuery = allKeywords.slice(0, 20);
  const velocities: Array<{ keyword: string; changeRate: number }> = [];

  try {
    const trendMap = await getSearchTrendBatch(keywordsToQuery, { startDate, endDate, timeUnit });

    for (const [keyword, data] of trendMap) {
      if (data.length < 4) continue;
      const changeRate = calculateChangeRate(data, period);
      if (changeRate !== null) {
        velocities.push({ keyword, changeRate });
      }
    }
  } catch (err) {
    console.error("[trending] DataLab batch error:", err);
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



