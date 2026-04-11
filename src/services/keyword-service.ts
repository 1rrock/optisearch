import {
  getKeywordStats,
  getRelatedKeywords as getRelatedKeywordsRaw,
} from "@/shared/lib/naver-searchad";
import {
  searchBlog,
  searchCafe,
  searchKin,
  searchShopping,
  searchNews,
  getAutocompleteSuggestions,
} from "@/shared/lib/naver-search";
import { estimateVolumeFromBlogRatio, estimateVolumeFromDataLab } from "@/shared/lib/naver-datalab";
import type { ConfidenceLevel } from "@/shared/lib/naver-datalab";
import { createServerClient } from "@/shared/lib/supabase";
import type {
  KeywordSearchResult,
  RelatedKeyword,
  CompetitionLevel,
  SaturationIndex,
} from "@/entities/keyword/model/types";
import { gradeFromScore, getSaturationThreshold, CENSORED_VOLUME_THRESHOLD, ANOMALY_VOLUME_THRESHOLD, ANOMALY_BLOG_THRESHOLD } from "@/shared/config/constants";
import { cached, CacheKeys, CacheTTL } from "@/services/cache-service";

// ---------------------------------------------------------------------------
// Shared volume lookup helper (corpus-first, SearchAd fallback)
// ---------------------------------------------------------------------------

/**
 * Build a volume map for the given keywords by checking keyword_corpus first,
 * then falling back to SearchAd for any corpus misses.
 * Used as the getRefVolumes callback for estimateVolumeFromDataLab.
 */
export async function getVolumeMapFromCorpusOrSearchAd(
  keywords: string[],
  supabase: Awaited<ReturnType<typeof createServerClient>>
): Promise<Map<string, { pc: number; mobile: number }>> {
  const result = new Map<string, { pc: number; mobile: number }>();

  const { data: corpusRows } = await supabase
    .from("keyword_corpus")
    .select("keyword, pc_volume, mobile_volume")
    .in("keyword", keywords);

  const corpusHits = new Set<string>();
  for (const row of (corpusRows ?? []) as Array<{ keyword: string; pc_volume: number; mobile_volume: number }>) {
    if (row.pc_volume > 0 || row.mobile_volume > 0) {
      result.set(row.keyword, { pc: row.pc_volume, mobile: row.mobile_volume });
      corpusHits.add(row.keyword);
    }
  }

  const remaining = keywords.filter(k => !corpusHits.has(k));
  if (remaining.length > 0) {
    const stats = await getKeywordStats(remaining);
    for (const stat of stats) {
      result.set(stat.relKeyword, { pc: stat.monthlyPcQcCnt, mobile: stat.monthlyMobileQcCnt });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function toCompetitionLevel(raw: string): CompetitionLevel {
  if (raw === "낮음" || raw === "중간" || raw === "높음") return raw;
  return "높음";
}

function buildSaturationIndex(ratio: number): SaturationIndex {
  const threshold = getSaturationThreshold(ratio);
  return {
    value: ratio,
    label: threshold.label,
    score: threshold.score,
  };
}

/**
 * Estimate CTR for censored keywords using non-censored peers from the same
 * SearchAd batch response. Falls back through 3 tiers:
 *   1. Same compIdx peers → average CTR
 *   2. All non-censored peers → average CTR
 *   3. Hardcoded conservative defaults (typical Naver averages)
 */
export function estimateCtrFromPeers(
  stats: Array<{ monthlyAvePcCtr: number; monthlyAveMobileCtr: number; compIdx: string }>,
  targetCompIdx: string
): { pcCtr: number; mobileCtr: number } {
  const nonCensored = stats.filter(
    (s) => s.monthlyAvePcCtr > 0 || s.monthlyAveMobileCtr > 0
  );

  // Tier 1: same compIdx peers
  const sameComp = nonCensored.filter((s) => s.compIdx === targetCompIdx);
  if (sameComp.length > 0) {
    return {
      pcCtr: sameComp.reduce((sum, s) => sum + s.monthlyAvePcCtr, 0) / sameComp.length / 100,
      mobileCtr: sameComp.reduce((sum, s) => sum + s.monthlyAveMobileCtr, 0) / sameComp.length / 100,
    };
  }

  // Tier 2: all non-censored peers
  if (nonCensored.length > 0) {
    return {
      pcCtr: nonCensored.reduce((sum, s) => sum + s.monthlyAvePcCtr, 0) / nonCensored.length / 100,
      mobileCtr: nonCensored.reduce((sum, s) => sum + s.monthlyAveMobileCtr, 0) / nonCensored.length / 100,
    };
  }

  // Tier 3: hardcoded conservative defaults
  return { pcCtr: 0.02, mobileCtr: 0.03 };
}

/**
 * Composite score (0–100):
 *   - Search volume score (0–35): log-scaled
 *   - Saturation score   (0–35): from getSaturationThreshold
 *   - Competition inverse (0–30): 낮음=30, 중간=15, 높음=5
 */
function calcCompositeScore(
  totalSearchVolume: number,
  saturationScore: number,
  competition: CompetitionLevel
): number {
  // Volume score: log10(volume+1) normalised to [0, 35] assuming max ~1,000,000
  const maxLogVolume = Math.log10(1_000_000 + 1);
  const logVolume = Math.log10(totalSearchVolume + 1);
  const volumeScore = Math.min(35, (logVolume / maxLogVolume) * 35);

  // Saturation score: threshold.score is 0–100, scale to 0–35
  const satScore = (saturationScore / 100) * 35;

  // Competition inverse score
  const compScore =
    competition === "낮음" ? 30 : competition === "중간" ? 15 : 5;

  return Math.round(Math.min(100, volumeScore + satScore + compScore));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function upsertCorpus(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  keyword: string,
  sourceSeed: string,
  pcVolume: number,
  mobileVolume: number
): void {
  const today = new Date().toISOString().split("T")[0];
  supabase.from("keyword_corpus").upsert(
    {
      keyword,
      source_seed: sourceSeed,
      pc_volume: pcVolume,
      mobile_volume: mobileVolume,
      first_seen_at: today,
      last_seen_at: today,
    },
    { onConflict: "keyword" }
  ).then(() => {}, () => {});
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Full keyword analysis: combines SearchAd stats with Naver Search section
 * data to produce a KeywordSearchResult with grade and saturation index.
 */
export async function analyzeKeyword(
  keyword: string
): Promise<KeywordSearchResult> {
  return cached(CacheKeys.keywordAnalysis(keyword), CacheTTL.KEYWORD, async () => {
    const [statsResults, blogResponse, cafeResponse, kinResponse, shoppingResponse, newsResponse] =
      await Promise.all([
        getKeywordStats([keyword]),
        searchBlog(keyword, 7),
        searchCafe(keyword),
        searchKin(keyword),
        searchShopping(keyword),
        searchNews(keyword, 5).catch(() => ({ items: [], total: 0 })),
      ]);

    const stat = statsResults.find((s) => s.relKeyword === keyword) ?? statsResults[0];

    let pcSearchVolume = stat?.monthlyPcQcCnt ?? 0;
    let mobileSearchVolume = stat?.monthlyMobileQcCnt ?? 0;
    let totalSearchVolume = pcSearchVolume + mobileSearchVolume;
    let isEstimated = false;
    let confidence: ConfidenceLevel | undefined;
    const blogPostCount = blogResponse.total;

    // Reverse-estimate volume for censored keywords or anomalies (SearchAd returns 0, 10/10 floors, or suspicious lows)
    if (totalSearchVolume <= CENSORED_VOLUME_THRESHOLD || (totalSearchVolume < ANOMALY_VOLUME_THRESHOLD && blogPostCount > ANOMALY_BLOG_THRESHOLD)) {
      // 1. Check keyword_corpus first — may have historical volume from before censorship
      const supabase = await createServerClient();
      const { data: corpusRow } = await supabase
        .from("keyword_corpus")
        .select("pc_volume, mobile_volume")
        .eq("keyword", keyword)
        .single();

      if (corpusRow && (corpusRow.pc_volume + corpusRow.mobile_volume) > CENSORED_VOLUME_THRESHOLD) {
        // Corpus value is above censored floor — trust it
        pcSearchVolume = corpusRow.pc_volume;
        mobileSearchVolume = corpusRow.mobile_volume;
        totalSearchVolume = pcSearchVolume + mobileSearchVolume;
        isEstimated = true;
      } else {
        // 2. Blog-ratio estimation (primary fallback — unlimited API, perfect ranking)
        const blogEstimated = await estimateVolumeFromBlogRatio(
          keyword,
          (keywords) => getVolumeMapFromCorpusOrSearchAd(keywords, supabase),
          async (kw) => { const r = await searchBlog(kw, 1); return r.total; }
        ).catch(() => null);

        if (blogEstimated) {
          pcSearchVolume = blogEstimated.pcSearchVolume;
          mobileSearchVolume = blogEstimated.mobileSearchVolume;
          totalSearchVolume = blogEstimated.totalSearchVolume;
          isEstimated = true;
          confidence = blogEstimated.confidence;

          upsertCorpus(supabase, keyword, "blog-ratio", blogEstimated.pcSearchVolume, blogEstimated.mobileSearchVolume);
        } else {
          // 3. DataLab estimation (last resort — limited API)
          const estimated = await estimateVolumeFromDataLab(keyword, (keywords) => getVolumeMapFromCorpusOrSearchAd(keywords, supabase));
          if (estimated) {
            pcSearchVolume = estimated.pcSearchVolume;
            mobileSearchVolume = estimated.mobileSearchVolume;
            totalSearchVolume = estimated.totalSearchVolume;
            isEstimated = true;
            confidence = estimated.confidence ?? "low";

            upsertCorpus(supabase, keyword, "datalab-auto", estimated.pcSearchVolume, estimated.mobileSearchVolume);
          }
        }
      }
    }

    const competition = toCompetitionLevel(stat?.compIdx ?? "높음");
    let pcCtr = (stat?.monthlyAvePcCtr ?? 0) / 100;
    let mobileCtr = (stat?.monthlyAveMobileCtr ?? 0) / 100;

    // Censored keywords: SearchAd returns CTR=0 → estimate from peers in the same batch
    if (pcCtr === 0 && mobileCtr === 0 && totalSearchVolume > 0) {
      const fallback = estimateCtrFromPeers(statsResults, stat?.compIdx ?? "높음");
      pcCtr = fallback.pcCtr;
      mobileCtr = fallback.mobileCtr;
    }

    const clickRate = totalSearchVolume > 0
      ? (pcSearchVolume * pcCtr + mobileSearchVolume * mobileCtr) / totalSearchVolume
      : 0;

    // Estimated monthly clicks from CTR data
    const estimatedClicks = Math.round(
      pcSearchVolume * pcCtr + mobileSearchVolume * mobileCtr
    );

    const saturationRatio =
      blogPostCount > 0 ? totalSearchVolume / blogPostCount : totalSearchVolume;
    const saturationIndex = buildSaturationIndex(saturationRatio);

    const compositeScore = calcCompositeScore(
      totalSearchVolume,
      saturationIndex.score,
      competition
    );
    const keywordGrade = gradeFromScore(compositeScore);

    const topPosts = blogResponse.items.map((item) => ({
      title: item.title,
      description: item.description,
      link: item.link,
      bloggerName: item.bloggername,
      postdate: item.postdate,
    }));

    const sectionData = {
      blog: { total: blogResponse.total, isVisible: blogResponse.total > 0 },
      cafe: { total: cafeResponse.total, isVisible: cafeResponse.total > 0 },
      kin: { total: kinResponse.total, isVisible: kinResponse.total > 0 },
      shopping: { total: shoppingResponse.total, isVisible: shoppingResponse.total > 0 },
      news: { total: newsResponse.total, isVisible: newsResponse.total > 0 },
    };

    return {
      keyword,
      pcSearchVolume,
      mobileSearchVolume,
      totalSearchVolume,
      competition,
      clickRate,
      blogPostCount,
      saturationIndex,
      keywordGrade,
      sectionData,
      topPosts,
      shoppingData: null,
      createdAt: new Date().toISOString(),
      isEstimated: isEstimated || undefined,
      confidence: confidence || undefined,
      estimatedClicks,
    };
  });
}

/**
 * Fetch and grade related keywords for a seed keyword.
 * Returns top 20 results sorted by total search volume descending.
 */
export async function getRelatedKeywords(
  keyword: string
): Promise<RelatedKeyword[]> {
  return cached(CacheKeys.relatedKeywords(keyword), CacheTTL.RELATED, async () => {
    // Stage 1: Parallel fetch — SearchAd + Autocomplete
    const [stats, autocompleteSuggestions] = await Promise.all([
      getRelatedKeywordsRaw(keyword),
      getAutocompleteSuggestions(keyword),
    ]);

    // Deduplicate: normalize whitespace for comparison
    const normalize = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
    const searchAdKeywords = new Set(stats.map(s => normalize(s.relKeyword)));

    // Filter new autocomplete keywords not in SearchAd, cap at 10
    const newKeywords = autocompleteSuggestions
      .filter(kw => !searchAdKeywords.has(normalize(kw)))
      .slice(0, 10);

    // Stage 2: Get volumes for new keywords via SearchAd (5s timeout)
    // getKeywordStats returns the queried keywords PLUS their related keywords.
    // Filter to only the keywords we asked about to avoid polluting results.
    const newKeywordsSet = new Set(newKeywords.map(normalize));
    let newStats: Awaited<ReturnType<typeof getKeywordStats>> = [];
    if (newKeywords.length > 0) {
      try {
        const raw = await Promise.race([
          getKeywordStats(newKeywords),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("getKeywordStats timeout")), 5000)
          ),
        ]);
        newStats = raw.filter(s => newKeywordsSet.has(normalize(s.relKeyword)));
      } catch {
        // Timeout or failure: proceed with SearchAd-only results
      }
    }

    // Merge and deduplicate across both sources
    const seen = new Set<string>();
    const allStats = [...stats, ...newStats].filter(s => {
      const key = normalize(s.relKeyword);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by total volume, take top 20
    const top20 = allStats
      .map((s) => ({
        stat: s,
        pc: s.monthlyPcQcCnt,
        mobile: s.monthlyMobileQcCnt,
        total: s.monthlyPcQcCnt + s.monthlyMobileQcCnt,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);

    // Stage 3: Fetch blog counts with concurrency limit (unchanged)
    const CONCURRENCY = 5;
    const blogCounts: number[] = new Array(top20.length).fill(-1);
    let timedOut = false;

    try {
      await Promise.race([
        (async () => {
          for (let i = 0; i < top20.length; i += CONCURRENCY) {
            if (timedOut) break;
            const batch = top20.slice(i, i + CONCURRENCY);
            const results = await Promise.all(
              batch.map((item) =>
                searchBlog(item.stat.relKeyword, 1)
                  .then((r) => r.total)
                  .catch(() => 0)
              )
            );
            results.forEach((count, j) => { blogCounts[i + j] = count; });
          }
        })(),
        new Promise<never>((_, reject) => setTimeout(() => {
          timedOut = true;
          reject(new Error("timeout"));
        }, 3000)),
      ]);
    } catch {
      // Timeout or total failure: remaining blogCounts stay at -1 (not fetched)
    }

    const NEUTRAL_SATURATION = buildSaturationIndex(0.25);

    return top20.map((item, i) => {
      const competition = toCompetitionLevel(item.stat.compIdx);
      const blogPostCount = blogCounts[i];
      const saturationIndex = blogPostCount < 0
        ? NEUTRAL_SATURATION
        : buildSaturationIndex(blogPostCount > 0 ? item.total / blogPostCount : item.total);
      const compositeScore = calcCompositeScore(item.total, saturationIndex.score, competition);
      return {
        keyword: item.stat.relKeyword,
        pcSearchVolume: item.pc,
        mobileSearchVolume: item.mobile,
        competition,
        keywordGrade: gradeFromScore(compositeScore),
        saturationIndex,
      } satisfies RelatedKeyword;
    });
  });
}

/**
 * Batch-analyze multiple keywords, processing in groups of 5 (SearchAd limit)
 * with a 100ms delay between batches to respect rate limits.
 */
export async function analyzeKeywordBatch(
  keywords: string[]
): Promise<KeywordSearchResult[]> {
  const BATCH_SIZE = 5;
  const results: KeywordSearchResult[] = [];

  for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
    const batch = keywords.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(analyzeKeyword));
    results.push(...batchResults);

    if (i + BATCH_SIZE < keywords.length) {
      await sleep(100);
    }
  }

  return results;
}
