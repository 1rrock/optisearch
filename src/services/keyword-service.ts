import {
  getKeywordStats,
  getRelatedKeywords as getRelatedKeywordsRaw,
} from "@/shared/lib/naver-searchad";
import {
  searchBlog,
  searchCafe,
  searchKin,
  searchShopping,
} from "@/shared/lib/naver-search";
import type {
  KeywordSearchResult,
  RelatedKeyword,
  CompetitionLevel,
  SaturationIndex,
} from "@/entities/keyword/model/types";
import { gradeFromScore, getSaturationThreshold } from "@/shared/config/constants";
import { cached, CacheKeys, CacheTTL } from "@/services/cache-service";

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
    const [statsResults, blogResponse, cafeResponse, kinResponse, shoppingResponse] =
      await Promise.all([
        getKeywordStats([keyword]),
        searchBlog(keyword, 7),
        searchCafe(keyword),
        searchKin(keyword),
        searchShopping(keyword),
      ]);

    const stat = statsResults.find((s) => s.relKeyword === keyword) ?? statsResults[0];

    const pcSearchVolume = stat?.monthlyPcQcCnt ?? 0;
    const mobileSearchVolume = stat?.monthlyMobileQcCnt ?? 0;
    const totalSearchVolume = pcSearchVolume + mobileSearchVolume;
    const competition = toCompetitionLevel(stat?.compIdx ?? "높음");
    const clickRate =
      ((stat?.monthlyAvePcCtr ?? 0) + (stat?.monthlyAveMobileCtr ?? 0)) / 2;

    const blogPostCount = blogResponse.total;
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

    return stats
      .map((s) => {
        const pc = s.monthlyPcQcCnt;
        const mobile = s.monthlyMobileQcCnt;
        const total = pc + mobile;
        const competition = toCompetitionLevel(s.compIdx);
        const saturationIndex = buildSaturationIndex(total > 0 ? total : 0);
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
