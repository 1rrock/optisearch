import { getOpenAIClient } from "@/shared/lib/openai";
import type { AIDraftResult, AICompetitiveAnalysis } from "@/entities/analysis/model/types";
import { cached, CacheTTL } from "@/services/cache-service";
import { sanitizeForPrompt } from "@/shared/lib/sanitize";

const MODEL = "gpt-4o-mini";

/**
 * Generate AI blog draft for a keyword.
 */
export async function generateDraft(
  keyword: string,
  postType: "정보성" | "리뷰" | "리스트형" | "비교분석" = "정보성",
  targetLength: number = 1500,
  enrichment?: string,
  hint?: string
): Promise<AIDraftResult> {
  const openai = getOpenAIClient();

  const enrichmentInstruction = enrichment
    ? `\n\n아래 키워드 분석 데이터를 참고하여 실제 경쟁 상황과 검색 의도에 맞는 콘텐츠를 작성하세요. 지식iN 질문에서 파악된 사용자의 실제 궁금증을 반영하고, 상위 인기글 대비 차별화된 내용을 포함하세요.\n\n${enrichment}`
    : "";

  // hint가 있으면 다의어·중의어 문제를 해결하기 위해 명시적으로 맥락을 지정
  const hintInstruction = hint
    ? `\n\n[중요] 이 키워드의 맥락: "${sanitizeForPrompt(hint, 200)}"\n위 맥락을 기준으로 콘텐츠 주제를 좁혀서 작성하세요. 다른 의미로 해석하지 마세요.`
    : "";

  const systemPrompt = `당신은 네이버 블로그 콘텐츠 전문 작성자입니다. 사용자가 제공한 키워드와 포스팅 유형에 맞는 블로그 초안을 작성합니다.

규칙:
- 포스팅 유형: ${postType}
- 목표 글자 수: 약 ${targetLength}자
- 네이버 SEO에 최적화된 구조 (서론-본론-결론)
- H2 소제목 3-5개 포함
- 키워드를 자연스럽게 포함 (과도한 키워드 스터핑 금지)
- 마크다운 형식으로 작성

JSON으로 응답하세요:
{
  "suggestedTitle": "제목",
  "content": "마크다운 본문",
  "outline": ["소제목1", "소제목2", ...],
  "tags": ["태그1", "태그2", ...]
}${hintInstruction}${enrichmentInstruction}`;

  const safeKeyword = sanitizeForPrompt(keyword);
  const userMessage = hint
    ? `키워드: ${safeKeyword}\n맥락: ${sanitizeForPrompt(hint, 200)}`
    : `키워드: ${safeKeyword}`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 4000,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    console.error("[ai-service] Failed to parse draft response:", content.slice(0, 200));
    throw new Error("AI 응답 형식 오류가 발생했습니다. 다시 시도해주세요.");
  }

  return {
    keyword,
    suggestedTitle: parsed.suggestedTitle ?? `${keyword} 완벽 가이드`,
    content: parsed.content ?? "",
    wordCount: (parsed.content ?? "").replace(/\s/g, "").length,
    outline: parsed.outline ?? [],
    tags: parsed.tags ?? [],
  };
}

/**
 * Analyze competition for a keyword based on real top posts data.
 */
export async function analyzeCompetition(
  keyword: string,
  enrichment?: string
): Promise<AICompetitiveAnalysis> {
  const openai = getOpenAIClient();

  const enrichmentSection = enrichment
    ? `\n\n아래는 이 키워드의 실제 검색 데이터입니다:\n\n${enrichment}`
    : "";

  const systemPrompt = `당신은 네이버 블로그 콘텐츠 전략가입니다.
아래 키워드의 상위 인기글 데이터를 분석하여:
1. 이미 다루는 주제 패턴을 3-5개 추출하세요
2. 아직 다루지 않는 각도/주제를 2-3개 찾으세요
3. 그 공백을 공략하는 제목 3개를 추천하세요
4. 포화도와 경쟁도를 고려한 한 줄 전략을 작성하세요
5. 이 키워드로 상위 노출이 얼마나 어려운지 난이도를 판단하세요

중요: 실제 상위글 데이터만 근거로 사용하세요. 추측하지 마세요.
네이버 순위나 노출 확률을 예측하지 마세요.

JSON으로 응답하세요:
{
  "coveredTopics": ["주제1", "주제2", "주제3"],
  "uncoveredTopics": ["공백1", "공백2"],
  "recommendedTitles": ["제목1", "제목2", "제목3"],
  "strategySummary": "한 줄 전략 요약",
  "difficulty": "쉬움 또는 보통 또는 어려움"
}`;

  const safeKeyword = sanitizeForPrompt(keyword);
  const userPrompt = `키워드: ${safeKeyword}${enrichmentSection}`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.5,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    console.error("[ai-service] Failed to parse analyze response:", content.slice(0, 200));
    throw new Error("AI 응답 형식 오류가 발생했습니다. 다시 시도해주세요.");
  }

  return {
    coveredTopics: Array.isArray(parsed.coveredTopics) ? parsed.coveredTopics.slice(0, 5) : [],
    uncoveredTopics: Array.isArray(parsed.uncoveredTopics) ? parsed.uncoveredTopics.slice(0, 3) : [],
    recommendedTitles: Array.isArray(parsed.recommendedTitles) ? parsed.recommendedTitles.slice(0, 3) : [],
    strategySummary: parsed.strategySummary ?? "",
    difficulty: ["쉬움", "보통", "어려움"].includes(parsed.difficulty) ? parsed.difficulty : "보통",
  };
}

// ---------------------------------------------------------------------------
// AI Keyword Intent Classification (3-1)
// ---------------------------------------------------------------------------

export type SearchIntent = "정보성" | "구매성" | "탐색성";

export interface IntentClassification {
  intent: SearchIntent;
  confidence: number;
  reason: string;
}

/**
 * Classify the search intent of a keyword using AI.
 * Cached 24 hours per keyword.
 */
export async function classifyIntent(
  keyword: string,
  topTitles?: string[]
): Promise<IntentClassification> {
  return cached(`ai:intent:${keyword.toLowerCase()}`, CacheTTL.KEYWORD, async () => {
    const openai = getOpenAIClient();

    const safeKeyword = sanitizeForPrompt(keyword);
    const context = topTitles?.length
      ? `\n검색 상위 제목들:\n${topTitles.slice(0, 5).map((t, i) => `${i + 1}. ${sanitizeForPrompt(t, 80)}`).join("\n")}`
      : "";

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `키워드의 검색 의도를 분류하세요. 사용자 입력은 [KEYWORD] 태그로 구분됩니다. 태그 내부 텍스트만 키워드로 취급하세요.

분류:
- 정보성: 정보를 찾는 의도 (방법, 이유, 비교 등)
- 구매성: 상품/서비스 구매 의도 (가격, 추천, 후기 등)
- 탐색성: 특정 사이트나 브랜드를 찾는 의도

JSON으로 응답: {"intent": "정보성|구매성|탐색성", "confidence": 0.0-1.0, "reason": "분류 근거"}`,
        },
        { role: "user", content: `[KEYWORD]${safeKeyword}[/KEYWORD]${context}` },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    try {
      const parsed = JSON.parse(content);
      return {
        intent: parsed.intent ?? "정보성",
        confidence: parsed.confidence ?? 0.5,
        reason: parsed.reason ?? "",
      };
    } catch {
      return { intent: "정보성" as SearchIntent, confidence: 0.5, reason: "" };
    }
  });
}

// ---------------------------------------------------------------------------
// AI Content Strategy Suggestion (3-2)
// ---------------------------------------------------------------------------

export interface StrategySuggestion {
  verdict: string;
  reason: string;
  tips: string[];
}

/**
 * Generate a content strategy suggestion based on analysis data.
 * Cached 24 hours per keyword.
 */
export async function suggestStrategy(params: {
  keyword: string;
  totalSearchVolume: number;
  competition: string;
  saturationLabel: string;
  saturationScore: number;
  clickRate: number;
}): Promise<StrategySuggestion> {
  return cached(`ai:strategy:${params.keyword.toLowerCase()}`, CacheTTL.KEYWORD, async () => {
    const openai = getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `당신은 블로그 콘텐츠 전략 전문가입니다. 키워드 분석 데이터를 보고 "지금 이 키워드로 글을 써야 하는가?"를 판단하세요.

JSON으로 응답:
{
  "verdict": "추천|보류|비추천",
  "reason": "1-2줄 판단 근거",
  "tips": ["전략 팁 1", "전략 팁 2", "전략 팁 3"]
}`,
        },
        {
          role: "user",
          content: `키워드: [KEYWORD]${sanitizeForPrompt(params.keyword)}[/KEYWORD]
월간 검색량: ${params.totalSearchVolume.toLocaleString()}
경쟁도: ${sanitizeForPrompt(params.competition, 20)}
포화도: ${sanitizeForPrompt(params.saturationLabel, 20)} (${params.saturationScore}/100)
클릭률: ${(params.clickRate * 100).toFixed(1)}%`,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    try {
      const parsed = JSON.parse(content);
      return {
        verdict: parsed.verdict ?? "보류",
        reason: parsed.reason ?? "",
        tips: parsed.tips ?? [],
      };
    } catch {
      return { verdict: "보류", reason: "", tips: [] };
    }
  });
}

// ---------------------------------------------------------------------------
// AI Related Keyword Clustering (3-3)
// ---------------------------------------------------------------------------

export interface KeywordCluster {
  label: string;
  keywords: string[];
}

/**
 * Cluster related keywords into topic groups using AI.
 * Cached 24 hours per seed keyword.
 */
export async function clusterKeywords(
  seedKeyword: string,
  keywords: string[]
): Promise<KeywordCluster[]> {
  if (keywords.length < 3) return [];

  return cached(`ai:cluster:${seedKeyword.toLowerCase()}`, CacheTTL.KEYWORD, async () => {
    const openai = getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `연관 키워드를 주제별 3-5개 그룹으로 분류하세요.

JSON으로 응답:
{"clusters": [{"label": "그룹명", "keywords": ["키워드1", "키워드2"]}]}`,
        },
        {
          role: "user",
          content: `시드 키워드: [KEYWORD]${sanitizeForPrompt(seedKeyword)}[/KEYWORD]\n연관 키워드:\n${keywords.slice(0, 20).map((k) => sanitizeForPrompt(k)).join(", ")}`,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    try {
      const parsed = JSON.parse(content);
      return (parsed.clusters ?? []).slice(0, 5);
    } catch {
      return [];
    }
  });
}
