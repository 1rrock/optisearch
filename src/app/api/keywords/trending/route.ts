import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { createServerClient } from "@/shared/lib/supabase";
import { getSearchTrendBatch } from "@/shared/lib/naver-datalab";
import { getKeywordStats } from "@/shared/lib/naver-searchad";
import { cached } from "@/services/cache-service";
import { formatDate } from "@/shared/lib/utils";
import { checkRateLimit } from "@/shared/lib/rate-limit";
import { calculateDailyChangeRate } from "@/shared/lib/date-utils";

export interface TrendingKeywordItem {
  keyword: string;
  volume: number;
  changeRate: number;
  estimatedDelta: number;
  direction: "up" | "down" | "stable";
  newsTitle?: string | null;
  newsLink?: string | null;
}

export interface TrendingResponse {
  period: "daily" | "monthly";
  keywords: TrendingKeywordItem[];
  lastUpdated?: string;
}

// Daily: 15-min cache (cron runs every 4h; stay within one cron window)
// Monthly: 5-min cache (live DataLab calculation, avoid hammering API)
const CACHE_TTL_DAILY = 15 * 60 * 1000;  // 15 minutes
const CACHE_TTL_MONTHLY = 5 * 60 * 1000;

/**
 * GET /api/keywords/trending?period=daily|monthly
 *
 * Primary: reads pre-computed trend data from keyword_trend_daily (populated by cron).
 * Fallback: live DataLab calculation (legacy behavior).
 */
export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const rateLimitResult = await checkRateLimit(user.userId);
  if (!rateLimitResult.allowed) {
    return Response.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get("period") ?? "daily") as "daily" | "monthly";

  if (period !== "daily" && period !== "monthly") {
    return Response.json({ error: "period must be daily or monthly" }, { status: 400 });
  }

  try {
    const ttl = period === "daily" ? CACHE_TTL_DAILY : CACHE_TTL_MONTHLY;
    const result = await cached<TrendingResponse>(
      `trending:${period}`,
      ttl,
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
  // Daily: use cron-collected data from keyword_trend_daily
  if (period === "daily") {
    const precomputed = await fetchFromTrendDaily();
    if (precomputed) return precomputed;
  }

  // Monthly or daily fallback: live DataLab calculation
  return fetchLiveFallback(period);
}

async function fetchFromTrendDaily(): Promise<TrendingResponse | null> {
  const supabase = await createServerClient();

  // Find the latest recorded date
  const { data: dateRow } = await supabase
    .from("keyword_trend_daily")
    .select("recorded_date")
    .order("recorded_date", { ascending: false })
    .limit(1);

  if (!dateRow || dateRow.length === 0) return null;

  const latestDate = (dateRow as Array<{ recorded_date: string }>)[0].recorded_date;

  // Fetch that date's data, sorted by composite_score (NULLs last), fallback to |change_rate|.
  // No volume filter — RSS-sourced trending keywords (news figures, events) may have
  // volume=0 but are valid real-time trends ranked by composite_score.
  const { data, error } = await supabase
    .from("keyword_trend_daily")
    .select("keyword, change_rate, monthly_volume, estimated_delta, news_title, news_link, composite_score")
    .eq("recorded_date", latestDate)
    .order("composite_score", { ascending: false, nullsFirst: false })
    .limit(200);

  if (error || !data || data.length === 0) return null;

  type TrendRow = {
    keyword: string;
    change_rate: number;
    monthly_volume: number;
    estimated_delta: number;
    news_title: string | null;
    news_link: string | null;
    composite_score: number | null;
  };

  // DB sorts by composite_score; for NULL rows (pre-migration), fallback sort by |change_rate|
  const sorted = (data as TrendRow[]).sort((a, b) => {
    const sa = a.composite_score;
    const sb = b.composite_score;
    if (sa !== null && sb !== null) return sb - sa;
    if (sa !== null) return -1;
    if (sb !== null) return 1;
    return Math.abs(b.change_rate) - Math.abs(a.change_rate);
  });

  const keywords: TrendingKeywordItem[] = sorted.slice(0, 30).map((row) => ({
    keyword: row.keyword,
    volume: row.monthly_volume,
    changeRate: Math.round(row.change_rate * 10) / 10,
    estimatedDelta: row.estimated_delta,
    direction:
      row.change_rate > 5 ? "up" : row.change_rate < -5 ? "down" : "stable",
    newsTitle: row.news_title ?? null,
    newsLink: row.news_link ?? null,
  }));

  return { period: "daily", keywords, lastUpdated: latestDate };
}

// ---------------------------------------------------------------------------
// Legacy fallback: live DataLab + SearchAd (used when trend_daily is empty)
// ---------------------------------------------------------------------------

async function fetchLiveFallback(
  period: "daily" | "monthly"
): Promise<TrendingResponse> {
  const supabase = await createServerClient();
  const { data: corpusTop, error: corpusError } = await supabase
    .from("keyword_corpus")
    .select("keyword")
    .order("total_volume", { ascending: false })
    .limit(20);
  if (corpusError) {
    console.error("[trending] Corpus query failed:", corpusError.message);
  }
  const allKeywords = corpusTop?.map(r => r.keyword) ?? [];
  const now = new Date();
  const timeUnit = period === "daily" ? ("date" as const) : ("month" as const);

  let startDate: string;
  if (period === "daily") {
    startDate = formatDate(new Date(now.getTime() - 30 * 86400000));
  } else {
    startDate = formatDate(new Date(now.getFullYear(), now.getMonth() - 6, 1));
  }
  const endDate = formatDate(now);

  const keywordsToQuery = allKeywords.slice(0, 20);
  const velocities: Array<{ keyword: string; changeRate: number }> = [];

  try {
    const trendMap = await getSearchTrendBatch(keywordsToQuery, {
      startDate,
      endDate,
      timeUnit,
    });

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

  velocities.sort((a, b) => Math.abs(b.changeRate) - Math.abs(a.changeRate));
  const topKeywords = velocities.slice(0, 15);

  if (topKeywords.length === 0) {
    return { period, keywords: [] };
  }

  const volumeMap = new Map<string, number>();
  try {
    const stats = await getKeywordStats(
      topKeywords.map((k) => k.keyword)
    );
    for (const stat of stats) {
      if (topKeywords.some((k) => k.keyword === stat.relKeyword)) {
        volumeMap.set(
          stat.relKeyword,
          stat.monthlyPcQcCnt + stat.monthlyMobileQcCnt
        );
      }
    }
  } catch {
    // Continue without volume data
  }

  const keywords: TrendingKeywordItem[] = topKeywords.map(
    ({ keyword, changeRate }) => {
      const volume = volumeMap.get(keyword) ?? 0;
      return {
        keyword,
        volume,
        changeRate: Math.round(changeRate * 10) / 10,
        estimatedDelta: Math.round((volume * changeRate) / 100 / 30),
        direction:
          changeRate > 5 ? "up" : changeRate < -5 ? "down" : "stable",
      };
    }
  );

  return { period, keywords };
}

function calculateChangeRate(
  data: Array<{ period: string; ratio: number }>,
  period: "daily" | "monthly"
): number | null {
  if (period === "daily") {
    return calculateDailyChangeRate(data);
  }
  // Monthly: compare last 2 COMPLETE months (skip current partial month)
  // DataLab returns e.g. [Jan, Feb, Mar, Apr(partial)] — skip Apr, compare Mar vs Feb
  if (data.length < 3) return null;
  const complete = data.slice(0, -1); // drop current partial month
  const recent = complete[complete.length - 1];
  const previous = complete[complete.length - 2];
  if (!recent || !previous) return null;

  const recentRatio = recent.ratio;
  const prevRatio = previous.ratio;
  if (prevRatio === 0) return recentRatio > 0 ? 100 : 0;
  return ((recentRatio - prevRatio) / prevRatio) * 100;
}
