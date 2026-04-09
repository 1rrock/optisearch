import { createServerClient } from "@/shared/lib/supabase";
import { getSearchTrendBatch } from "@/shared/lib/naver-datalab";
import { getDynamicTrendingSeeds } from "@/shared/config/trending-seeds";
import { searchNewsNoRetry } from "@/shared/lib/naver-search";
import { formatDate, stripHtmlTags } from "@/shared/lib/utils";
import { getKSTDateString, calculateDailyChangeRate } from "@/shared/lib/date-utils";
import { cache } from "@/services/cache-service";
import { getRedis } from "@/shared/lib/redis";
import { verifyCronAuth } from "@/shared/lib/cron-auth";

/** Wall-clock guard: skip news enrichment if elapsed exceeds this. */
const NEWS_ENRICHMENT_DEADLINE_MS = 45_000;
/** Max keywords to enrich with news headlines. */
const NEWS_ENRICHMENT_LIMIT = 50;
/** Concurrency limit for parallel news fetches. */
const NEWS_CONCURRENCY = 5;

/** Validate URL is https:// only — prevents open redirect / javascript: injection. */
function sanitizeNewsUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Vercel Cron job — runs daily to collect DataLab trend ratios
 * for dynamic seed keywords and store change rates.
 *
 * Schedule: "0 20 * * *" (UTC) = KST 새벽 5시
 * Runs AFTER collect-keywords (KST 3시) so corpus is fresh.
 *
 * Can also be called manually:
 *   GET /api/cron/collect-trending?manual=true
 *   Authorization: Bearer ${CRON_SECRET}
 */
export const maxDuration = 60;

export async function GET(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const startTime = Date.now();

  try {
    const supabase = await createServerClient();

    // 0. Verify collect-keywords ran today (dependency check)
    const today = getKSTDateString();
    const { count: freshCorpusCount } = await supabase
      .from("keyword_corpus")
      .select("*", { count: "exact", head: true })
      .eq("last_seen_at", today);

    if ((freshCorpusCount ?? 0) === 0) {
      console.warn("[collect-trending] WARNING: collect-keywords may not have run today — corpus has no rows with last_seen_at = " + today);
    }

    // 1. Collect dynamic seeds from corpus + static config
    const seeds = await getDynamicTrendingSeeds(supabase);
    console.log(`[collect-trending] ${seeds.length} dynamic seeds`);

    // 2. Fetch DataLab trends (14 days, daily granularity)
    const now = new Date();
    const startDate = formatDate(new Date(now.getTime() - 14 * 86400000));
    const endDate = formatDate(now);

    const trendMap = await getSearchTrendBatch(seeds, {
      startDate,
      endDate,
      timeUnit: "date",
    });

    console.log(`[collect-trending] DataLab returned ${trendMap.size} keywords`);

    // 3. Calculate change rates and build rows

    // Fetch monthly volumes from corpus for estimatedDelta calculation
    const corpusKeywords = [...trendMap.keys()];
    const volumeMap = new Map<string, number>();

    const CHUNK = 500;
    for (let i = 0; i < corpusKeywords.length; i += CHUNK) {
      const chunk = corpusKeywords.slice(i, i + CHUNK);
      const { data } = await supabase
        .from("keyword_corpus")
        .select("keyword, total_volume")
        .in("keyword", chunk);

      if (data) {
        for (const row of data as Array<{ keyword: string; total_volume: number }>) {
          volumeMap.set(row.keyword, row.total_volume ?? 0);
        }
      }
    }

    const rows: Array<{
      keyword: string;
      ratio_recent: number;
      ratio_prev: number;
      change_rate: number;
      monthly_volume: number;
      estimated_delta: number;
      recorded_date: string;
      news_title: string | null;
      news_link: string | null;
    }> = [];

    for (const [keyword, data] of trendMap) {
      if (data.length < 4) continue;

      const changeRate = calculateDailyChangeRate(data);
      if (changeRate === null || Math.abs(changeRate) < 1) continue;

      const recent = data.slice(-7);
      const previous = data.slice(-14, -7);
      const recentAvg = recent.reduce((s, d) => s + d.ratio, 0) / recent.length;
      const prevAvg = previous.reduce((s, d) => s + d.ratio, 0) / (previous.length || 1);

      const monthlyVolume = volumeMap.get(keyword) ?? 0;
      const estimatedDelta = Math.round(
        (monthlyVolume * changeRate) / 100 / 30
      );

      rows.push({
        keyword,
        ratio_recent: Math.round(recentAvg * 10) / 10,
        ratio_prev: Math.round(prevAvg * 10) / 10,
        change_rate: Math.round(changeRate * 100) / 100,
        monthly_volume: monthlyVolume,
        estimated_delta: estimatedDelta,
        recorded_date: today,
        news_title: null,
        news_link: null,
      });
    }

    // 4. Best-effort news headline enrichment for top keywords
    const elapsed = Date.now() - startTime;
    if (elapsed < NEWS_ENRICHMENT_DEADLINE_MS && rows.length > 0) {
      // Sort by absolute change rate, take top N for enrichment
      const sortedForNews = [...rows]
        .sort((a, b) => Math.abs(b.change_rate) - Math.abs(a.change_rate))
        .slice(0, NEWS_ENRICHMENT_LIMIT);

      // sortedForNews items are references to objects in rows[] — mutations here update the original array
      let enriched = 0;

      for (let i = 0; i < sortedForNews.length; i += NEWS_CONCURRENCY) {
        if (Date.now() - startTime > NEWS_ENRICHMENT_DEADLINE_MS) {
          console.warn(
            `[collect-trending] News enrichment stopped at ${enriched}/${sortedForNews.length} (wall-clock guard)`
          );
          break;
        }

        const batch = sortedForNews.slice(i, i + NEWS_CONCURRENCY);
        const results = await Promise.allSettled(
          batch.map(async (row) => {
            const news = await searchNewsNoRetry(row.keyword, 1, "date");
            return { row, news };
          })
        );

        for (const result of results) {
          if (result.status === "fulfilled") {
            const { row, news } = result.value;
            const item = news.items?.[0];
            if (item) {
              row.news_title = stripHtmlTags(item.title);
              row.news_link = sanitizeNewsUrl(item.link);
              enriched++;
            }
          } else {
            console.warn(
              "[collect-trending] News fetch failed:",
              result.reason instanceof Error
                ? result.reason.message
                : result.reason
            );
          }
        }
      }

      console.log(
        `[collect-trending] News enrichment: ${enriched}/${sortedForNews.length} keywords`
      );
    } else if (rows.length > 0) {
      console.warn("[collect-trending] Skipped news enrichment (time budget exceeded)");
    }

    // 5. Upsert into keyword_trend_daily
    let upserted = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error } = await supabase
        .from("keyword_trend_daily")
        .upsert(chunk, { onConflict: "keyword,recorded_date" });

      if (error) {
        console.error("[collect-trending] Upsert error:", error.message);
      } else {
        upserted += chunk.length;
      }
    }

    // 6. Clean up old data (> 35 days) — keep 35 days for 30-day rolling window
    const cutoff = getKSTDateString(new Date(Date.now() - 35 * 86400000));

    await supabase
      .from("keyword_trend_daily")
      .delete()
      .lt("recorded_date", cutoff);

    // 7. Invalidate trending cache AFTER all writes and deletes complete
    cache.delete("trending:daily");
    cache.delete("trending:monthly");
    const redis = getRedis();
    if (redis) {
      await Promise.allSettled([
        redis.del("trending:daily"),
        redis.del("trending:monthly"),
      ]);
    }

    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    const stale = (freshCorpusCount ?? 0) === 0;
    const result = {
      seeds: seeds.length,
      datalabResults: trendMap.size,
      upserted,
      elapsed: `${elapsedSec}s`,
      ...(stale && { stale: true }),
    };

    console.log("[collect-trending] Done:", result);
    return Response.json(result);
  } catch (err) {
    console.error(
      "[collect-trending] Fatal error:",
      err instanceof Error ? err.message : err
    );
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
