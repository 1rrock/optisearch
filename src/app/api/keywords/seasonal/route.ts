import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { getSearchTrendBatch, type TrendDataPoint } from "@/shared/lib/naver-datalab";
import { getKeywordStats } from "@/shared/lib/naver-searchad";
import { getSeasonalSeeds, MONTH_LABELS } from "@/shared/config/seasonal-keywords";
import { cached, CacheTTL } from "@/services/cache-service";
import { formatDate } from "@/shared/lib/utils";

export interface SeasonalKeywordItem {
  keyword: string;
  avgVolume: number;
  multiplier: number;
  peakMonth: number;
  peakLabel: string;
}

export interface SeasonalResponse {
  month: number;
  label: string;
  keywords: SeasonalKeywordItem[];
}

/**
 * GET /api/keywords/seasonal?month=4
 *
 * Returns seasonal keywords for a given month with:
 * - avgVolume: monthly search volume (PC + Mobile)
 * - multiplier: ratio of that month's trend vs yearly average
 * - peakMonth / peakLabel: month with highest search ratio
 */
export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month");
  const month = monthParam ? parseInt(monthParam, 10) : new Date().getMonth() + 1;

  if (month < 1 || month > 12 || isNaN(month)) {
    return Response.json({ error: "month must be 1-12" }, { status: 400 });
  }

  try {
    const result = await cached<SeasonalResponse>(
      `seasonal:${month}`,
      CacheTTL.KEYWORD, // 24 hours
      () => fetchSeasonalData(month)
    );
    return Response.json(result);
  } catch (err) {
    console.error("[api/keywords/seasonal] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

async function fetchSeasonalData(month: number): Promise<SeasonalResponse> {
  const seeds = getSeasonalSeeds(month);
  if (seeds.length === 0) {
    return { month, label: MONTH_LABELS[month] ?? `${month}월`, keywords: [] };
  }

  // Date range: 24 months back from today
  const now = new Date();
  const endDate = formatDate(now);
  const startDate = formatDate(new Date(now.getFullYear() - 2, now.getMonth(), 1));

  // 1. Fetch DataLab trends — batch up to 5 keywords per API call (80% quota savings)
  const trendMap = new Map<string, { ratios: Map<number, number>; avgRatio: number; peakMonth: number }>();

  const batchResults = await getSearchTrendBatch(seeds, { startDate, endDate, timeUnit: "month" }).catch((err) => {
    console.error("[seasonal] DataLab batch trend fetch failed:", err);
    return new Map<string, TrendDataPoint[]>();
  });

  for (const keyword of seeds) {
    const data = batchResults.get(keyword);
    if (!data?.length) continue;

    const ratiosByMonth = new Map<number, number[]>();

    for (const point of data) {
      // period format: "YYYY-MM-01"
      const m = parseInt(point.period.split("-")[1], 10);
      const existing = ratiosByMonth.get(m) ?? [];
      existing.push(point.ratio);
      ratiosByMonth.set(m, existing);
    }

    // Average ratio per month across 2 years
    const monthlyAvgRatios = new Map<number, number>();
    let totalRatio = 0;
    let count = 0;
    for (const [m, ratios] of ratiosByMonth) {
      const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
      monthlyAvgRatios.set(m, avg);
      totalRatio += avg;
      count++;
    }

    const overallAvg = count > 0 ? totalRatio / count : 1;
    let peakMonth = month;
    let peakRatio = 0;
    for (const [m, avg] of monthlyAvgRatios) {
      if (avg > peakRatio) {
        peakRatio = avg;
        peakMonth = m;
      }
    }

    trendMap.set(keyword, {
      ratios: monthlyAvgRatios,
      avgRatio: overallAvg,
      peakMonth,
    });
  }

  // 2. Fetch SearchAd volumes
  const volumeMap = new Map<string, number>();
  try {
    const stats = await getKeywordStats(seeds);
    for (const stat of stats) {
      // Match by exact keyword (SearchAd returns related keywords too)
      if (seeds.includes(stat.relKeyword)) {
        volumeMap.set(
          stat.relKeyword,
          stat.monthlyPcQcCnt + stat.monthlyMobileQcCnt
        );
      }
    }
  } catch (err) {
    console.error("[seasonal] SearchAd volume fetch failed:", err);
    // Continue without volume data
  }

  // 3. Build response
  const keywords: SeasonalKeywordItem[] = [];

  for (const keyword of seeds) {
    const trend = trendMap.get(keyword);
    const avgVolume = volumeMap.get(keyword) ?? 0;

    if (!trend) {
      // No trend data — still include with default values
      keywords.push({
        keyword,
        avgVolume,
        multiplier: 1,
        peakMonth: month,
        peakLabel: MONTH_LABELS[month] ?? `${month}월`,
      });
      continue;
    }

    const monthRatio = trend.ratios.get(month) ?? 0;
    const multiplier = trend.avgRatio > 0 ? monthRatio / trend.avgRatio : 1;

    keywords.push({
      keyword,
      avgVolume,
      multiplier: Math.round(multiplier * 10) / 10, // 1 decimal
      peakMonth: trend.peakMonth,
      peakLabel: MONTH_LABELS[trend.peakMonth] ?? `${trend.peakMonth}월`,
    });
  }

  // Sort by multiplier descending
  keywords.sort((a, b) => b.multiplier - a.multiplier);

  return {
    month,
    label: MONTH_LABELS[month] ?? `${month}월`,
    keywords,
  };
}

