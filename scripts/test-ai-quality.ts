/**
 * AI 기능 퀄리티 테스트 스크립트
 * - 경쟁 분석 (analyzeCompetition)
 * - 블로그 초안 생성 (generateDraft - non-streaming)
 * - 검색의도 분류 (classifyIntent)
 * - 전략 제안 (suggestStrategy)
 *
 * 실행: npx tsx scripts/test-ai-quality.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local") });
import OpenAI from "openai";

const MODEL = "gpt-4o-mini";

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY in .env.local");
  return new OpenAI({ apiKey });
}

// ──────────────────────────────────────────
// 1. 경쟁 분석
// ──────────────────────────────────────────
async function testCompetitiveAnalysis(keyword: string) {
  const openai = getClient();
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🔍 [경쟁 분석] 키워드: "${keyword}"`);
  console.log("=".repeat(60));

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

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `키워드: ${keyword}` },
    ],
    temperature: 0.5,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);
  
  console.log("\n📊 이미 다루는 주제:");
  (parsed.coveredTopics ?? []).forEach((t: string, i: number) => console.log(`  ${i+1}. ${t}`));
  
  console.log("\n💡 공백 (아직 안 다루는 각도):");
  (parsed.uncoveredTopics ?? []).forEach((t: string, i: number) => console.log(`  ${i+1}. ${t}`));
  
  console.log("\n📝 추천 제목:");
  (parsed.recommendedTitles ?? []).forEach((t: string, i: number) => console.log(`  ${i+1}. ${t}`));
  
  console.log(`\n🎯 전략: ${parsed.strategySummary}`);
  console.log(`📈 난이도: ${parsed.difficulty}`);
  
  console.log(`\n💰 토큰 사용: ${completion.usage?.total_tokens ?? "N/A"}`);
  return parsed;
}

// ──────────────────────────────────────────
// 2. 블로그 초안 생성
// ──────────────────────────────────────────
async function testDraftGeneration(keyword: string, postType: string = "정보성", targetLength: number = 1500) {
  const openai = getClient();
  console.log(`\n${"=".repeat(60)}`);
  console.log(`✍️  [AI 초안 생성] 키워드: "${keyword}" | 유형: ${postType} | 목표: ${targetLength}자`);
  console.log("=".repeat(60));

  const systemPrompt = `당신은 월 방문자 10만 명을 보유한 네이버 블로그 파워 인플루언서이자 전문 대필 작가입니다.

[절대 규칙: 개요나 요약을 절대 금지합니다.]
사용자가 즉시 복사하여 블로그에 그대로 붙여넣을 수 있는 '완성된 최종 원고'를 작성하세요.

규칙:
- 포스팅 유형: ${postType}
- 목표 글자 수: 약 ${targetLength}자 (분량을 채워 풍성하게 작성)
- 어조: 독자에게 친근하게 말을 건네는 듯한 대화체 (~합니다, ~해보세요, ~더라고요)
- 가독성: 모바일 가독성을 위해 2-3문장마다 줄바꿈을 하세요.
- 감성: 문맥에 어울리는 이모지(✨, 🔥, 💡 등)를 적절히 활용하세요.
- 구조: 네이버 SEO에 최적화된 구조 (도입부-본론-마무리)
- 분량 통제: 각 H2 소제목 하단에는 최소 3개 이상의 풍성한 문단(Paragraph)을 작성하세요. 단순 정보 나열이 아닌 '구체적인 꿀팁', '주의사항', '실제 활용 예시'를 포함하여 내용을 꽉 채우세요.
- 키워드: 본문 전체에 자연스럽게 5-7회 녹여내세요.
- 마크다운 형식으로 작성

JSON으로 응답하세요:
{
  "suggestedTitle": "제목",
  "content": "마크다운 본문",
  "outline": ["소제목1", "소제목2", "소제목3"],
  "tags": ["태그1", "태그2", "태그3"]
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
  
  const bodyText: string = parsed.content ?? "";
  const charCount = bodyText.replace(/\s/g, "").length;
  const keywordCount = (bodyText.match(new RegExp(keyword, "g")) || []).length;
  const h2Count = (bodyText.match(/^## /gm) || []).length;
  const emojiCount = (bodyText.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|✨|🔥|💡|📌|🎯|⭐|💰|🏠|🚗|📱|🎁|👉|✅|❌|⚠️|💪|🤔|😊|👍|📝|🔍/gu) || []).length;

  console.log(`\n📋 제목: ${parsed.suggestedTitle}`);
  console.log(`\n📑 소제목 구조:`);
  (parsed.outline ?? []).forEach((o: string, i: number) => console.log(`  ${i+1}. ${o}`));
  console.log(`\n🏷️  태그: ${(parsed.tags ?? []).join(", ")}`);
  
  console.log(`\n${"─".repeat(40)}`);
  console.log("📄 본문 (처음 800자):");
  console.log("─".repeat(40));
  console.log(bodyText.slice(0, 800));
  if (bodyText.length > 800) console.log("\n... (이하 생략)");
  
  console.log(`\n${"─".repeat(40)}`);
  console.log("📊 퀄리티 분석:");
  console.log("─".repeat(40));
  console.log(`  글자 수: ${charCount}자 (목표: ${targetLength}자) ${charCount >= targetLength * 0.8 ? "✅" : "⚠️ 부족"}`);
  console.log(`  키워드 삽입: ${keywordCount}회 ${keywordCount >= 3 ? "✅" : "⚠️ 부족"}`);
  console.log(`  H2 소제목: ${h2Count}개 ${h2Count >= 3 ? "✅" : "⚠️ 부족"}`);
  console.log(`  이모지 사용: ${emojiCount}개 ${emojiCount >= 3 ? "✅" : "⚠️ 부족"}`);
  console.log(`  대화체 문체: ${bodyText.includes("해보세요") || bodyText.includes("더라고요") || bodyText.includes("합니다") ? "✅" : "⚠️ 확인 필요"}`);
  console.log(`  줄바꿈 (모바일 가독성): ${bodyText.split("\n\n").length >= 5 ? "✅" : "⚠️ 확인 필요"}`);
  
  console.log(`\n💰 토큰 사용: ${completion.usage?.total_tokens ?? "N/A"}`);
  return parsed;
}

// ──────────────────────────────────────────
// 3. 검색 의도 분류
// ──────────────────────────────────────────
async function testIntentClassification(keyword: string) {
  const openai = getClient();
  
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `키워드의 검색 의도를 분류하세요.

분류:
- 정보성: 정보를 찾는 의도 (방법, 이유, 비교 등)
- 구매성: 상품/서비스 구매 의도 (가격, 추천, 후기 등)
- 탐색성: 특정 사이트나 브랜드를 찾는 의도

JSON으로 응답: {"intent": "정보성|구매성|탐색성", "confidence": 0.0-1.0, "reason": "분류 근거"}`,
      },
      { role: "user", content: `[KEYWORD]${keyword}[/KEYWORD]` },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  return JSON.parse(content);
}

// ──────────────────────────────────────────
// 4. 전략 제안
// ──────────────────────────────────────────
async function testStrategySuggestion(keyword: string) {
  const openai = getClient();

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
        content: `키워드: ${keyword}
월간 검색량: 15,000
경쟁도: 중간
포화도: 보통 (60/100)
클릭률: 3.2%`,
      },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  return JSON.parse(content);
}

// ──────────────────────────────────────────
// Main: 3개 키워드로 전체 테스트
// ──────────────────────────────────────────
async function main() {
  console.log("🚀 OptiSearch AI 기능 퀄리티 테스트 시작\n");
  console.log(`모델: ${MODEL}`);
  console.log(`시간: ${new Date().toLocaleString("ko-KR")}`);

  const testKeywords = [
    { keyword: "에어팟 프로 3 리뷰", type: "리뷰" },
    { keyword: "퇴사 후 프리랜서 시작하는 법", type: "정보성" },
    { keyword: "서울 브런치 맛집 추천", type: "리스트형" },
  ];

  for (const { keyword, type } of testKeywords) {
    // 1. 경쟁 분석
    await testCompetitiveAnalysis(keyword);

    // 2. 검색 의도 + 전략 (간략하게)
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🧠 [검색 의도 & 전략] 키워드: "${keyword}"`);
    console.log("=".repeat(60));
    
    const intent = await testIntentClassification(keyword);
    console.log(`  의도: ${intent.intent} (확신도: ${(intent.confidence * 100).toFixed(0)}%)`);
    console.log(`  근거: ${intent.reason}`);

    const strategy = await testStrategySuggestion(keyword);
    console.log(`  판정: ${strategy.verdict}`);
    console.log(`  이유: ${strategy.reason}`);
    console.log(`  팁:`);
    (strategy.tips ?? []).forEach((t: string, i: number) => console.log(`    ${i+1}. ${t}`));

    // 3. 블로그 초안 생성
    await testDraftGeneration(keyword, type, 1500);
    
    console.log(`\n\n${"🔸".repeat(30)}\n`);
  }

  console.log("\n✅ 전체 테스트 완료!");
}

main().catch(console.error);
