import { createServerClient } from "@/shared/lib/supabase";
import { getSearchTrendBatch, getDatalabQuotaUsage } from "@/shared/lib/naver-datalab";
import { getKSTDateString } from "@/shared/lib/date-utils";
import { getRedis } from "@/shared/lib/redis";
import { verifyCronAuth } from "@/shared/lib/cron-auth";

const MIN_VOLUME = 100;
const MAX_CANDIDATES = 200;
const REQUIRED_ZERO_MONTHS = 6;

export const maxDuration = 60;

/**
 * Vercel Cron job — runs daily to verify truly new keywords via DataLab 12-month history.
 *
 * Schedule: "30 19 * * *" (UTC) = KST 04:30
 * Runs AFTER collect-keywords (KST 03:00) so corpus is fresh.
 *
 * Logic:
 * 1. Pull candidates from keyword_corpus where first_seen_at = today AND total_volume >= MIN_VOLUME
 * 2. Query DataLab 12-month monthly history for each candidate
 * 3. Verify: last 6 months (excluding current month) must ALL have ratio === 0
 * 4. Store verified list in Redis with 7-day TTL
 */
export async function GET(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  try {
    const supabase = await createServerClient();
    const today = getKSTDateString();

    // 1. Fetch candidates: first_seen_at = today, volume >= MIN_VOLUME
    const { data: candidates, error } = await supabase
      .from("keyword_corpus")
      .select("keyword, pc_volume, mobile_volume, total_volume")
      .eq("first_seen_at", today)
      .gte("total_volume", MIN_VOLUME)
      .order("total_volume", { ascending: false })
      .limit(MAX_CANDIDATES);

    if (error) {
      console.error("[collect-new-keywords] Corpus query error:", error.message);
      return Response.json({ error: "Corpus query failed" }, { status: 500 });
    }

    if (!candidates || candidates.length === 0) {
      console.log("[collect-new-keywords] No candidates found for", today);
      return Response.json({ date: today, candidates: 0, verified: 0, top5: [] });
    }

    const keywords = candidates.map((c) => c.keyword);

    // 2. Pre-flight DataLab quota check
    const quota = await getDatalabQuotaUsage();
    const estimatedCalls = Math.ceil(keywords.length / 5);
    if (quota.count + estimatedCalls > 900) {
      console.warn(`[collect-new-keywords] Quota too high: ${quota.count} used, need ~${estimatedCalls} more`);
      return Response.json({ error: "DataLab quota insufficient", quota: quota.count }, { status: 429 });
    }

    // 3. Query DataLab 12-month monthly history (KST dates to match corpus)
    const now = new Date();
    const endDate = getKSTDateString(now);
    const startDate = getKSTDateString(new Date(now.getTime() - 365 * 86400000));

    const trendMap = await getSearchTrendBatch(keywords, {
      startDate,
      endDate,
      timeUnit: "month",
    });

    // 4. Verify: last 6 months (excluding current month) must all be ratio === 0
    const currentMonth = today.slice(0, 7); // "YYYY-MM"
    const volumeMap = new Map(
      candidates.map((c) => [c.keyword, c.total_volume as number])
    );

    const verified: Array<{ keyword: string; volume: number }> = [];

    for (const [keyword, dataPoints] of trendMap) {
      // Filter out current month
      const historicalPoints = dataPoints.filter(
        (dp) => !dp.period.startsWith(currentMonth)
      );

      if (historicalPoints.length === 0) {
        // No historical data at all — treat as genuinely new
        verified.push({ keyword, volume: volumeMap.get(keyword) ?? 0 });
        continue;
      }

      // Check last REQUIRED_ZERO_MONTHS months of historical data
      const lastMonths = historicalPoints.slice(-REQUIRED_ZERO_MONTHS);
      const allZero = lastMonths.every((dp) => dp.ratio === 0);

      if (allZero) {
        verified.push({ keyword, volume: volumeMap.get(keyword) ?? 0 });
      }
    }

    // Also include keywords that DataLab had no data for (truly new — never indexed)
    for (const keyword of keywords) {
      if (
        !trendMap.has(keyword) &&
        !verified.some((v) => v.keyword === keyword)
      ) {
        verified.push({ keyword, volume: volumeMap.get(keyword) ?? 0 });
      }
    }

    // 4. Sort by volume descending
    verified.sort((a, b) => b.volume - a.volume);

    // 5. Store in Redis
    const redis = getRedis();
    if (redis) {
      const key = `new-keywords:verified:${today}`;
      await redis.set(key, JSON.stringify(verified), { ex: 7 * 86400 });
      console.log(`[collect-new-keywords] Stored ${verified.length} keywords in Redis key=${key}`);
    } else {
      console.log("[collect-new-keywords] Redis unavailable — skipping cache store");
    }

    const result = {
      date: today,
      candidates: candidates.length,
      verified: verified.length,
      top5: verified.slice(0, 5),
    };

    console.log("[collect-new-keywords] Done:", result);
    return Response.json(result);
  } catch (err) {
    console.error(
      "[collect-new-keywords] Fatal error:",
      err instanceof Error ? err.message : err
    );
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
