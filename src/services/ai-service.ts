import { getOpenAIClient } from "@/shared/lib/openai";
import type { AITitleSuggestion, AIDraftResult, AIContentScore, AIContentSubMetrics } from "@/entities/analysis/model/types";

const MODEL = "gpt-4o-mini";

/**
 * Generate AI blog title suggestions for a keyword.
 */
export async function generateTitleSuggestions(
  keyword: string,
  context?: string
): Promise<AITitleSuggestion[]> {
  const openai = getOpenAIClient();

  const systemPrompt = `당신은 네이버 블로그 SEO 전문가입니다. 사용자가 제공한 키워드를 기반으로 클릭률이 높은 블로그 제목 5개를 추천합니다.

규칙:
- 각 제목은 40자 이내
- 네이버 블로그 특성에 맞는 한국어 자연어 제목
- 숫자, 질문형, 감성형 등 다양한 패턴 활용
- 클릭을 유도하되 과장/낚시성 제목 지양

JSON 배열로 응답하세요:
[{"title": "제목", "rank": 1, "reason": "추천 이유"}]`;

  const userPrompt = context
    ? `키워드: ${keyword}\n추가 설명: ${context}`
    : `키워드: ${keyword}`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);
  const suggestions: AITitleSuggestion[] = parsed.titles ?? parsed.suggestions ?? (Array.isArray(parsed) ? parsed : []);

  return suggestions.slice(0, 5).map((s, i) => ({
    title: s.title,
    rank: s.rank ?? i + 1,
    reason: s.reason ?? "",
  }));
}

/**
 * Generate AI blog draft for a keyword.
 */
export async function generateDraft(
  keyword: string,
  postType: "정보성" | "리뷰" | "리스트형" | "비교분석" = "정보성",
  targetLength: number = 1500
): Promise<AIDraftResult> {
  const openai = getOpenAIClient();

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
}`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `키워드: ${keyword}` },
    ],
    temperature: 0.7,
    max_tokens: 4000,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);

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
 * Score existing blog content for SEO optimization.
 */
export async function scoreContent(
  keyword: string,
  content: string
): Promise<AIContentScore> {
  const openai = getOpenAIClient();

  const systemPrompt = `당신은 네이버 블로그 SEO 분석 전문가입니다. 사용자가 제공한 키워드와 블로그 본문을 분석하여 SEO 최적화 점수를 산출합니다.

평가 항목 (각 0-100):
- keywordUsage: 키워드 포함 빈도와 자연스러운 배치
- readability: 문장 가독성, 길이, 흐름
- structure: H2 소제목, 단락 구분, 리스트 활용
- depth: 내용의 깊이와 정보량
- titleAttractiveness: 제목의 클릭 유인력 (제목이 없으면 본문 첫 줄 기준)

JSON으로 응답하세요:
{
  "totalScore": 82,
  "subMetrics": {
    "keywordUsage": 70,
    "readability": 90,
    "structure": 50,
    "depth": 85,
    "titleAttractiveness": 75
  },
  "improvements": ["개선사항1", "개선사항2", ...],
  "strengths": ["강점1", "강점2", ...]
}`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `키워드: ${keyword}\n\n본문:\n${content}` },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const result = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(result);

  const subMetrics: AIContentSubMetrics = {
    keywordUsage: parsed.subMetrics?.keywordUsage ?? 0,
    readability: parsed.subMetrics?.readability ?? 0,
    structure: parsed.subMetrics?.structure ?? 0,
    depth: parsed.subMetrics?.depth ?? 0,
    titleAttractiveness: parsed.subMetrics?.titleAttractiveness ?? 0,
  };

  const totalScore = parsed.totalScore ?? Math.round(
    (subMetrics.keywordUsage + subMetrics.readability + subMetrics.structure + subMetrics.depth + subMetrics.titleAttractiveness) / 5
  );

  // Import gradeFromScore to determine the grade
  const { gradeFromScore } = await import("@/shared/config/constants");

  return {
    totalScore,
    grade: gradeFromScore(totalScore),
    subMetrics,
    improvements: parsed.improvements ?? [],
    strengths: parsed.strengths ?? [],
  };
}
