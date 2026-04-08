/**
 * Category-based seed keywords for trending detection.
 * DataLab compares recent ratio vs prior period to calculate velocity.
 */

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

/**
 * Build dynamic trending seeds by combining static seeds with
 * high-volume and recently discovered keywords from keyword_corpus.
 */
export async function getDynamicTrendingSeeds(
  supabase: { from: (table: string) => any }
): Promise<string[]> {
  const { getKSTDateString } = await import("@/shared/lib/date-utils");
  const staticSeeds = getAllTrendingSeeds();
  const seedSet = new Set<string>(staticSeeds);

  const threeDaysAgo = getKSTDateString(new Date(Date.now() - 3 * 86400000));

  // Recent discoveries (last 3 days, top 80 by volume)
  try {
    const { data: recent } = await supabase
      .from("keyword_corpus")
      .select("keyword")
      .gte("first_seen_at", threeDaysAgo)
      .order("total_volume", { ascending: false })
      .limit(80);

    if (recent) {
      for (const r of recent as Array<{ keyword: string }>) {
        seedSet.add(r.keyword);
      }
    }
  } catch (err) {
    console.warn("[trending-seeds] Failed to fetch recent keywords:", err instanceof Error ? err.message : err);
  }

  // All-time top volume (top 80)
  try {
    const { data: top } = await supabase
      .from("keyword_corpus")
      .select("keyword")
      .order("total_volume", { ascending: false })
      .limit(80);

    if (top) {
      for (const r of top as Array<{ keyword: string }>) {
        seedSet.add(r.keyword);
      }
    }
  } catch (err) {
    console.warn("[trending-seeds] Failed to fetch top keywords:", err instanceof Error ? err.message : err);
  }

  return [...seedSet];
}
