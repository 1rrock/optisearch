/**
 * Category-based seed keywords for trending detection.
 * DataLab compares recent ratio vs prior period to calculate velocity.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getKSTDateString } from "@/shared/lib/date-utils";
import { fetchGoogleTrendsRSS } from "@/shared/lib/google-trends-rss";

export interface TrendCategory {
  name: string;
  keywords: string[];
}

export const TRENDING_CATEGORIES: TrendCategory[] = [
  {
    name: "IT/테크",
    keywords: ["아이폰", "갤럭시", "노트북추천", "태블릿", "AI", "챗GPT", "코딩", "블로그"],
  },
  {
    name: "패션/뷰티",
    keywords: ["봄옷코디", "원피스", "선크림", "향수추천", "네일아트", "헤어스타일", "운동화"],
  },
  {
    name: "여행/레저",
    keywords: ["국내여행", "해외여행", "제주도", "캠핑", "펜션", "항공권", "비행기표"],
  },
  {
    name: "건강/운동",
    keywords: ["다이어트", "헬스", "필라테스", "영양제", "프로바이오틱스", "단백질보충제", "러닝"],
  },
  {
    name: "음식/맛집",
    keywords: ["맛집추천", "카페추천", "배달음식", "밀키트", "레시피", "홈베이킹", "커피머신"],
  },
  {
    name: "생활/경제",
    keywords: ["부동산", "주식", "적금", "청약", "대출", "보험", "재테크", "연말정산"],
  },
  {
    name: "교육/취업",
    keywords: ["자격증", "공무원시험", "토익", "취업준비", "이력서", "자기소개서", "코딩테스트"],
  },
  {
    name: "육아/가족",
    keywords: ["유아용품", "이유식", "놀이공원", "키즈카페", "출산준비", "아기옷", "유모차"],
  },
];

/** Flatten all category seeds into a single array. */
export function getAllTrendingSeeds(): string[] {
  return TRENDING_CATEGORIES.flatMap((cat) => cat.keywords);
}

/** Maximum seed count to prevent unbounded DataLab quota consumption. */
const MAX_SEED_COUNT = 250;

/** Minimum RSS keywords required to use RSS as primary source. */
const MIN_RSS_KEYWORDS = 10;

/**
 * Build dynamic trending seeds by combining external RSS trending keywords
 * (or static fallback seeds) with high-volume and recently discovered
 * keywords from keyword_corpus.
 *
 * Primary: Google Trends RSS daily trending keywords for Korea.
 * Fallback: Static category seeds (TRENDING_CATEGORIES) if RSS fails or
 *           returns fewer than MIN_RSS_KEYWORDS results.
 */
export async function getDynamicTrendingSeeds(
  supabase: SupabaseClient
): Promise<string[]> {
  // 1. Try Google Trends RSS as primary seed source
  let seedSet: Set<string>;
  try {
    const rssKeywords = await fetchGoogleTrendsRSS();
    if (rssKeywords.length >= MIN_RSS_KEYWORDS) {
      seedSet = new Set<string>(rssKeywords);
      console.log(`[trending-seeds] RSS source: ${rssKeywords.length} keywords`);
    } else {
      console.warn(
        `[trending-seeds] RSS returned only ${rssKeywords.length} keywords (min: ${MIN_RSS_KEYWORDS}), using static fallback`
      );
      seedSet = new Set<string>(getAllTrendingSeeds());
    }
  } catch (err) {
    console.warn(
      "[trending-seeds] RSS fetch failed, using static fallback:",
      err instanceof Error ? err.message : err
    );
    seedSet = new Set<string>(getAllTrendingSeeds());
  }

  // 2. Enrich with corpus keywords (parallel queries)
  const threeDaysAgo = getKSTDateString(new Date(Date.now() - 3 * 86400000));

  const [recentResult, topResult] = await Promise.allSettled([
    supabase
      .from("keyword_corpus")
      .select("keyword")
      .gte("first_seen_at", threeDaysAgo)
      .order("total_volume", { ascending: false })
      .limit(80),
    supabase
      .from("keyword_corpus")
      .select("keyword")
      .order("total_volume", { ascending: false })
      .limit(80),
  ]);

  if (recentResult.status === "fulfilled" && recentResult.value.data) {
    for (const r of recentResult.value.data as Array<{ keyword: string }>) {
      seedSet.add(r.keyword);
    }
  } else if (recentResult.status === "rejected") {
    console.warn("[trending-seeds] Failed to fetch recent keywords:", recentResult.reason);
  }

  if (topResult.status === "fulfilled" && topResult.value.data) {
    for (const r of topResult.value.data as Array<{ keyword: string }>) {
      seedSet.add(r.keyword);
    }
  } else if (topResult.status === "rejected") {
    console.warn("[trending-seeds] Failed to fetch top keywords:", topResult.reason);
  }

  return [...seedSet].slice(0, MAX_SEED_COUNT);
}
