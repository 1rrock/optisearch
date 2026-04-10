/**
 * Dynamic trending seed keywords for trending detection.
 * Primary: Google Trends RSS discovery + keyword_corpus volume data.
 * Fallback: Seasonal seeds when corpus is empty (bootstrap state).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchGoogleTrendsRSS } from "@/shared/lib/google-trends-rss";
import { getKeywordStats } from "@/shared/lib/naver-searchad";
import { getSeasonalSeeds } from "@/shared/config/seasonal-keywords";

export interface TrendSeed {
  keyword: string;
  volume: number;
  source: "rss" | "corpus";
}

/** Maximum seed count to prevent unbounded DataLab quota consumption. */
const MAX_SEED_COUNT = 50;

/** Minimum RSS keywords required to use RSS as primary source. */
const MIN_RSS_KEYWORDS = 10;

/**
 * Build dynamic trending seeds by combining Google Trends RSS discovery
 * with high-volume and recently discovered keywords from keyword_corpus.
 *
 * Returns TrendSeed[] with volume metadata for each keyword.
 * Volume=0 seeds are filtered downstream by collect-trending.
 */
export async function getDynamicTrendingSeeds(
  supabase: SupabaseClient
): Promise<TrendSeed[]> {
  // 1. Try Google Trends RSS as discovery source
  let rssKeywords: string[] = [];
  try {
    const fetched = await fetchGoogleTrendsRSS();
    if (fetched.length >= MIN_RSS_KEYWORDS) {
      rssKeywords = fetched;
      console.log(`[trending-seeds] RSS source: ${rssKeywords.length} keywords`);
    } else {
      console.warn(
        `[trending-seeds] RSS returned only ${fetched.length} keywords (min: ${MIN_RSS_KEYWORDS}), using empty RSS set`
      );
    }
  } catch (err) {
    console.warn(
      "[trending-seeds] RSS fetch failed, using empty RSS set:",
      err instanceof Error ? err.message : err
    );
  }

  // 2. Corpus enrichment: top 100 by volume + top 100 by recency
  const [topVolumeResult, recentResult] = await Promise.allSettled([
    supabase
      .from("keyword_corpus")
      .select("keyword, total_volume")
      .order("total_volume", { ascending: false })
      .limit(100),
    supabase
      .from("keyword_corpus")
      .select("keyword, total_volume")
      .order("first_seen_at", { ascending: false })
      .limit(100),
  ]);

  // Build corpusVolumeMap from corpus results
  const corpusVolumeMap = new Map<string, number>();

  if (topVolumeResult.status === "fulfilled" && topVolumeResult.value.data) {
    for (const r of topVolumeResult.value.data as Array<{ keyword: string; total_volume: number }>) {
      corpusVolumeMap.set(r.keyword, r.total_volume ?? 0);
    }
  } else if (topVolumeResult.status === "rejected") {
    console.warn("[trending-seeds] Failed to fetch top-volume corpus keywords:", topVolumeResult.reason);
  }

  if (recentResult.status === "fulfilled" && recentResult.value.data) {
    for (const r of recentResult.value.data as Array<{ keyword: string; total_volume: number }>) {
      if (!corpusVolumeMap.has(r.keyword)) {
        corpusVolumeMap.set(r.keyword, r.total_volume ?? 0);
      }
    }
  } else if (recentResult.status === "rejected") {
    console.warn("[trending-seeds] Failed to fetch recent corpus keywords:", recentResult.reason);
  }

  // 3. Step 6: For RSS keywords NOT in corpus, fetch volume via SearchAd mini-batch
  const rssOnly = rssKeywords.filter(kw => !corpusVolumeMap.has(kw));
  if (rssOnly.length > 0) {
    try {
      const rssStats = await getKeywordStats(rssOnly.slice(0, 20));
      for (const stat of rssStats) {
        const pcVol = typeof stat.monthlyPcQcCnt === "number" ? stat.monthlyPcQcCnt : 0;
        const mobileVol = typeof stat.monthlyMobileQcCnt === "number" ? stat.monthlyMobileQcCnt : 0;
        const vol = pcVol + mobileVol;
        if (vol > 0) {
          corpusVolumeMap.set(stat.relKeyword, vol);
        }
      }
      console.log(`[trending-seeds] SearchAd mini-batch: ${rssOnly.length} RSS-only keywords queried`);
    } catch (err) {
      console.warn("[trending-seeds] SearchAd mini-batch failed:", err instanceof Error ? err.message : err);
    }
  }

  // 4. Bootstrap safeguard: if corpus empty AND RSS empty, use seasonal seeds
  if (corpusVolumeMap.size === 0 && rssKeywords.length === 0) {
    console.warn("[trending-seeds] Corpus and RSS both empty — using seasonal seeds as bootstrap fallback");
    const currentMonth = new Date().getMonth() + 1;
    const seasonalKeywords = getSeasonalSeeds(currentMonth);
    return seasonalKeywords.slice(0, MAX_SEED_COUNT).map(keyword => ({ keyword, volume: 0, source: "corpus" as const }));
  }

  // 5. Merge all keywords (RSS + corpus) into final TrendSeed[]
  const rssSet = new Set(rssKeywords);
  const allKeywords = new Set<string>([...rssKeywords, ...corpusVolumeMap.keys()]);
  const seeds: TrendSeed[] = [];
  for (const keyword of allKeywords) {
    seeds.push({
      keyword,
      volume: corpusVolumeMap.get(keyword) ?? 0,
      source: rssSet.has(keyword) ? "rss" : "corpus",
    });
  }

  // Partition: RSS seeds first (guaranteed inclusion), then corpus by volume
  const rssSeeds = seeds.filter(s => s.source === "rss");
  const corpusSeeds = seeds.filter(s => s.source === "corpus");
  corpusSeeds.sort((a, b) => b.volume - a.volume);
  seeds.length = 0;
  seeds.push(...rssSeeds, ...corpusSeeds);

  console.log(`[trending-seeds] Total seeds: ${seeds.length} (RSS: ${rssKeywords.length}, corpus: ${corpusVolumeMap.size})`);

  return seeds.slice(0, MAX_SEED_COUNT);
}
