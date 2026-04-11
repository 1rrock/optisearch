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
    const pcCtr = (stat?.monthlyAvePcCtr ?? 0) / 100;
    const mobileCtr = (stat?.monthlyAveMobileCtr ?? 0) / 100;
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
    const stats = await getRelatedKeywordsRaw(keyword);

    const neutralSaturation = buildSaturationIndex(0.25);

    return stats
      .map((s) => {
        const pc = s.monthlyPcQcCnt;
        const mobile = s.monthlyMobileQcCnt;
        const total = pc + mobile;
        const competition = toCompetitionLevel(s.compIdx);
        const saturationIndex = neutralSaturation;
        const compositeScore = calcCompositeScore(total, saturationIndex.score, competition);
        return {
          keyword: s.relKeyword,
          pcSearchVolume: pc,
          mobileSearchVolume: mobile,
          competition,
          keywordGrade: gradeFromScore(compositeScore),
        } satisfies RelatedKeyword;
      })
      .sort((a, b) => b.pcSearchVolume + b.mobileSearchVolume - (a.pcSearchVolume + a.mobileSearchVolume))
      .slice(0, 20);
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
