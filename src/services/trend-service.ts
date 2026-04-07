import { getSearchTrend } from "@/shared/lib/naver-datalab";
import { cached, CacheTTL } from "@/services/cache-service";

export interface TrendPoint {
  period: string; // YYYY-MM-DD
  ratio: number; // 0-100 relative value
}

export interface TrendResult {
  keyword: string;
  data: TrendPoint[];
}

export interface SeasonalityInfo {
  /** Months (1-12) that show seasonal spikes */
  peakMonths: number[];
  /** Human-readable labels for peak months */
  peakMonthLabels: string[];
  /** Strength of seasonality: "weak" | "moderate" | "strong" */
  strength: "weak" | "moderate" | "strong";
}

const MONTH_LABELS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

/**
 * Detect seasonality from monthly trend data (requires 2+ years).
 * A month is "peak" if its average ratio is ≥1.5× the overall average
 * AND it spikes in 2+ years.
 */
export function detectSeasonality(data: TrendPoint[]): SeasonalityInfo | null {
  if (data.length < 18) return null; // need ~1.5+ years minimum

  // Group ratios by month
  const byMonth: Map<number, number[]> = new Map();
  for (const d of data) {
    const month = new Date(d.period).getMonth() + 1; // 1-12
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month)!.push(d.ratio);
  }

  const overallMean = data.reduce((s, d) => s + d.ratio, 0) / data.length;
  if (overallMean === 0) return null;

  const peakMonths: number[] = [];
  for (const [month, ratios] of byMonth) {
    if (ratios.length < 2) continue; // need 2+ years of data for this month
    const monthMean = ratios.reduce((s, r) => s + r, 0) / ratios.length;
    const spikeCount = ratios.filter((r) => r >= overallMean * 1.3).length;
    if (monthMean >= overallMean * 1.5 && spikeCount >= 2) {
      peakMonths.push(month);
    }
  }

  if (peakMonths.length === 0) return null;

  // Determine strength based on how much the peak exceeds average
  const peakAvg = peakMonths.reduce((s, m) => {
    const ratios = byMonth.get(m)!;
    return s + ratios.reduce((a, b) => a + b, 0) / ratios.length;
  }, 0) / peakMonths.length;
  const ratio = peakAvg / overallMean;

  const strength = ratio >= 3 ? "strong" : ratio >= 2 ? "moderate" : "weak";

  const sorted = peakMonths.sort((a, b) => a - b);
  return {
    peakMonths: sorted,
    peakMonthLabels: sorted.map((m) => MONTH_LABELS[m - 1]),
    strength,
  };
}

/**
 * Get search trend data for keywords from Naver DataLab.
 * @param keywords - Array of keywords (max 5)
 * @param months - Number of months to look back (default 12)
 * @param device - Optional device filter: "pc" | "mo" | undefined (all)
 * @param gender - Optional gender filter: "m" | "f" | undefined (all)
 * @param ages - Optional age group array: ["1","2","3","4","5","6","7","8","9","10","11"]
 */
export async function getKeywordTrend(
  keywords: string[],
  months: number = 12,
  device?: string,
  gender?: string,
  ages?: string[],
  timeUnit?: "week" | "month"
): Promise<TrendResult[]> {
  const endDate = new Date();
  const startDate = new Date();
  if (months === -1) {
    startDate.setFullYear(2016, 0, 1);
  } else {
    startDate.setMonth(startDate.getMonth() - months);
  }

  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  const resolvedTimeUnit = timeUnit ?? (months <= 3 ? "week" : "month");
  const start = formatDate(startDate);
  const end = formatDate(endDate);

  const results = await Promise.all(
    keywords.map((kw) => {
      const cacheKey = `trend:${kw.toLowerCase()}:${months}:${device ?? ""}:${gender ?? ""}:${(ages ?? []).join(",")}:${resolvedTimeUnit}`;
      return cached<TrendResult>(cacheKey, CacheTTL.KEYWORD, async () => {
        const response = await getSearchTrend({
          keyword: kw,
          startDate: start,
          endDate: end,
          timeUnit: resolvedTimeUnit,
          device,
          gender,
          ages,
        });

        const result = response.results[0];
        return {
          keyword: result?.title ?? kw,
          data: (result?.data ?? []).map((d) => ({
            period: d.period,
            ratio: d.ratio,
          })),
        };
      });
    })
  );

  return results;
}
