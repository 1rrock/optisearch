import { getAnalysisData, updateAnalysisData } from "@/services/saved-keyword-service";
import { analyzeKeyword } from "@/services/keyword-service";
import { searchKin, getAutocompleteSuggestions } from "@/shared/lib/naver-search";
import { sanitizeForPrompt } from "@/shared/lib/sanitize";

export interface EnrichmentAnalysisData {
  totalSearchVolume: number;
  pcSearchVolume: number;
  mobileSearchVolume: number;
  competition: string;
  saturation: { value: number; label: string; score: number };
  topPosts: Array<{ title: string; description: string }>;
  blogPostCount: number;
  clickRate: number;
  adMetrics?: { plAvgDepth: number; avgCpc?: number };
  kinItems?: Array<{ title: string; description: string }>;
  autocompleteSuggestions?: string[];
}

const ENRICHMENT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * 엔리치먼트(지식iN 실제 질문 + 자동완성 + 검색량·포화도)는 이 제품의 유일한
 * 차별점이다. 이게 빠지면 초안은 ChatGPT가 그냥 써준 글과 구별되지 않는다.
 * 실측: 없으면 본문 1,496자·H2 0개, 있으면 2,199자·H2 3개.
 *
 * 예전 한도는 2초였다. 로컬 콜드 캐시에서 실측 1,910ms — 한도의 95%다.
 * Vercel 콜드 스타트와 네이버 API 지연이 겹치면 그대로 넘어간다.
 * 넘어가도 예외가 아니라 undefined 라서, 사용자는 아무 경고 없이 열등한
 * 초안을 받는다. 한도를 늘리고, 폴백이 실제로 얼마나 일어나는지 남긴다.
 */
const ENRICHMENT_TIMEOUT_MS = 6000;

export async function resolveEnrichment(
  userId: string,
  keyword: string,
  purpose: "analyze" | "draft" = "draft"
): Promise<string | undefined> {
  const startedAt = Date.now();
  try {
    const result = await Promise.race([
      _resolveEnrichmentInner(userId, keyword, purpose),
      new Promise<undefined>((resolve) =>
        setTimeout(() => resolve(undefined), ENRICHMENT_TIMEOUT_MS)
      ),
    ]);
    if (result === undefined) {
      console.warn(
        `[enrichment] fallback keyword="${keyword}" purpose=${purpose} ms=${Date.now() - startedAt}`
      );
    }
    return result;
  } catch (err) {
    console.warn(`[enrichment] error keyword="${keyword}" ms=${Date.now() - startedAt}`, err);
    return undefined;
  }
}

async function _resolveEnrichmentInner(
  userId: string,
  keyword: string,
  purpose: "analyze" | "draft"
): Promise<string | undefined> {
  // 1. Try DB cache first
  const cached = await getAnalysisData(userId, keyword);
  if (cached) {
    const ageMs = Date.now() - new Date(cached.analysisUpdatedAt).getTime();
    if (ageMs < ENRICHMENT_TTL_MS) {
      return buildEnrichmentBlock(cached.analysisData as unknown as EnrichmentAnalysisData, purpose);
    }
  }

  // 2. Realtime fetch: analyzeKeyword (Redis/memory cached) + searchKin + autocomplete in parallel
  const [keywordResult, kinResult, autocompleteResult] = await Promise.allSettled([
    analyzeKeyword(keyword),
    searchKin(keyword, 5),
    getAutocompleteSuggestions(keyword),
  ]);

  const keywordData = keywordResult.status === "fulfilled" ? keywordResult.value : null;
  const kinData = kinResult.status === "fulfilled" ? kinResult.value : null;
  const autocompleteData = autocompleteResult.status === "fulfilled" ? autocompleteResult.value : null;

  // Need at minimum the keyword analysis data
  if (!keywordData) return undefined;

  const topPostCount = purpose === "analyze" ? 7 : 5;
  const analysisData: EnrichmentAnalysisData = {
    totalSearchVolume: keywordData.totalSearchVolume,
    pcSearchVolume: keywordData.pcSearchVolume,
    mobileSearchVolume: keywordData.mobileSearchVolume,
    competition: keywordData.competition,
    saturation: {
      value: keywordData.saturationIndex.value,
      label: keywordData.saturationIndex.label,
      score: keywordData.saturationIndex.score,
    },
    topPosts: (keywordData.topPosts ?? []).slice(0, topPostCount).map((p) => ({
      title: p.title,
      description: p.description,
    })),
    blogPostCount: keywordData.blogPostCount,
    clickRate: keywordData.clickRate,
    adMetrics: keywordData.adMetrics
      ? {
          plAvgDepth: keywordData.adMetrics.plAvgDepth,
          avgCpc: keywordData.adMetrics.avgCpc,
        }
      : undefined,
    kinItems: kinData
      ? (kinData.items ?? []).slice(0, 5).map((item) => ({
          title: item.title,
          description: item.description,
        }))
      : undefined,
    autocompleteSuggestions: autocompleteData ? autocompleteData.slice(0, 10) : undefined,
  };

  // 3. Write-through to saved_keywords (fire-and-forget)
  updateAnalysisData(userId, keyword, analysisData as unknown as Record<string, unknown>).catch(() => {
    // intentionally ignored
  });

  return buildEnrichmentBlock(analysisData, purpose);
}

export function buildEnrichmentBlock(
  data: EnrichmentAnalysisData,
  purpose: "analyze" | "draft" = "draft"
): string {
  const lines: string[] = [];

  lines.push("[키워드 분석 데이터]");
  lines.push(
    `월간 검색량: PC ${data.pcSearchVolume.toLocaleString()} / 모바일 ${data.mobileSearchVolume.toLocaleString()} (총 ${data.totalSearchVolume.toLocaleString()})`
  );
  lines.push(
    `경쟁도: ${data.competition} | 포화도: ${data.saturation.label} (${data.saturation.score}/100) | 클릭률: ${(data.clickRate * 100).toFixed(1)}%`
  );
  lines.push(`블로그 포스트 수: ${data.blogPostCount.toLocaleString()}개`);

  if (data.adMetrics) {
    const adParts: string[] = [`광고 노출 평균 개수: ${data.adMetrics.plAvgDepth}`];
    if (data.adMetrics.avgCpc) adParts.push(`평균 CPC: ${data.adMetrics.avgCpc.toLocaleString()}원`);
    lines.push(adParts.join(" | "));
  }

  if (data.topPosts.length > 0) {
    lines.push("");
    lines.push(`상위 인기글 (${data.topPosts.length}개):`);
    data.topPosts.forEach((post, i) => {
      const title = sanitizeForPrompt(post.title, 60);
      const desc = sanitizeForPrompt(post.description, 80);
      lines.push(`${i + 1}. "${title}" - ${desc}`);
    });
  }

  if (data.kinItems && data.kinItems.length > 0) {
    lines.push("");
    lines.push("지식iN 주요 질문:");
    data.kinItems.forEach((item) => {
      const title = sanitizeForPrompt(item.title, 60);
      const desc = sanitizeForPrompt(item.description, 60);
      lines.push(`- "${title}" - ${desc}`);
    });
  }

  if (data.autocompleteSuggestions && data.autocompleteSuggestions.length > 0) {
    const suggestions = data.autocompleteSuggestions
      .map((s) => sanitizeForPrompt(s, 30))
      .join(", ");
    lines.push("");
    lines.push(`자동완성 키워드: ${suggestions}`);
  }

  // Dynamic strategy instruction based on saturation score + competition
  lines.push("");
  const strategyHeader = purpose === "analyze" ? "[경쟁 분석 지시]" : "[전략 지시]";
  lines.push(strategyHeader);
  lines.push(_buildStrategyInstruction(data.saturation.score, data.competition));

  return lines.join("\n");
}

function _buildStrategyInstruction(saturationScore: number, competition: string): string {
  if (saturationScore >= 70) {
    if (competition === "낮음") {
      return "검색량 대비 경쟁이 낮은 블루오션 키워드입니다. 기본에 충실한 정보성 콘텐츠로 상위 노출이 가능합니다.";
    }
    return "검색량은 충분하고 포화도가 낮아 기회가 있습니다. 기존 상위글과 차별화된 관점이나 최신 정보를 포함하세요.";
  }
  if (saturationScore >= 30) {
    if (competition === "높음") {
      return "경쟁이 치열한 편입니다. 롱테일 키워드(자동완성 참고)를 활용하고, 지식iN 질문에서 사용자의 실제 궁금증을 파악하여 답변형 콘텐츠를 작성하세요.";
    }
    return "적당한 경쟁 수준입니다. 상위 인기글의 패턴을 참고하되 더 깊이 있는 정보를 제공하세요.";
  }
  return "포화도가 매우 높아 상위 노출이 어렵습니다. 세부 키워드(자동완성 참고)로 주제를 좁히거나, 기존 글에 없는 독창적 관점/데이터를 포함하세요. 지식iN에서 아직 답변이 부족한 질문을 중심으로 콘텐츠를 구성하는 것이 효과적입니다.";
}
