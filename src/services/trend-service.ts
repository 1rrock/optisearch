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
  ages?: string[]
): Promise<TrendResult[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  const timeUnit = months <= 3 ? "week" : "month";
  const start = formatDate(startDate);
  const end = formatDate(endDate);

  const results = await Promise.all(
    keywords.map((kw) => {
      const cacheKey = `trend:${kw.toLowerCase()}:${months}:${device ?? ""}:${gender ?? ""}:${(ages ?? []).join(",")}`;
      return cached<TrendResult>(cacheKey, CacheTTL.KEYWORD, async () => {
        const response = await getSearchTrend({
          keyword: kw,
          startDate: start,
          endDate: end,
          timeUnit,
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
