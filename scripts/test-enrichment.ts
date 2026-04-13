/**
 * Enriched prompt quality test — 순수 AI 함수 품질 비교.
 * Supabase/Next.js 컨텍스트 없이 실행 가능.
 * 대표 키워드의 mock 분석 데이터로 enrichment block 생성 후 AI 응답 품질 비교.
 *
 * Usage: npx tsx --tsconfig tsconfig.json scripts/test-enrichment.ts [keyword]
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { buildEnrichmentBlock } from "@/services/enrichment-service";
import { analyzeCompetition, generateDraft } from "@/services/ai-service";
import type { EnrichmentAnalysisData } from "@/services/enrichment-service";

const KEYWORD = process.argv[2] ?? "강남 맛집";

// ── 테스트용 대표 mock 분석 데이터 ──────────────────────────────────────────

const MOCK_DATA: EnrichmentAnalysisData = {
  totalSearchVolume: 28400,
  pcSearchVolume: 7200,
  mobileSearchVolume: 21200,
  competition: "높음",
  saturation: { value: 0.07, label: "높음", score: 35 },
  blogPostCount: 420000,
  clickRate: 0.089,
  adMetrics: { plAvgDepth: 6.2, avgCpc: 890 },
  topPosts: [
    { title: "강남 맛집 BEST 20 — 현지인이 매일 가는 숨은 맛집", description: "강남역 주변 찐 맛집만 엄선. 줄 서도 먹을 가치 있는 식당 20곳 리스트" },
    { title: "강남 맛집 데이트 코스 완벽 가이드 2024", description: "분위기 좋고 맛도 좋은 강남 데이트 맛집. 예약 꿀팁까지 함께 정리했습니다" },
    { title: "강남역 점심 맛집 직장인 추천 TOP 10", description: "직장인이 실제로 다니는 가성비 좋은 강남 점심 맛집. 대기 없이 바로 입장 가능" },
    { title: "강남 3대 파스타집 솔직 후기 — 가격 대비 맛 비교", description: "강남에서 유명한 이탈리안 레스토랑 3곳 직접 방문 후 비교 리뷰" },
    { title: "강남 오마카세 가성비 맛집 추천 — 10만원 이하 코스", description: "강남에서 특별한 날 방문하기 좋은 가성비 오마카세 식당 모음" },
  ],
  kinItems: [
    { title: "강남역 근처 맛집 추천해주세요 데이트용으로", description: "분위기 좋고 가격 부담 없는 곳으로 추천 부탁드립니다" },
    { title: "강남 맛집 예약 없이 갈 수 있는 곳 있나요", description: "주말에 갑자기 방문해도 괜찮은 강남 맛집 알려주세요" },
    { title: "강남 맛집 점심 특선 있는 곳", description: "점심 가격이 저렴한 강남 레스토랑 추천 부탁드립니다" },
  ],
  autocompleteSuggestions: [
    "강남 맛집 추천", "강남 맛집 데이트", "강남 맛집 혼밥", "강남 맛집 점심",
    "강남 맛집 오마카세", "강남 맛집 한식", "강남 맛집 이탈리안", "강남역 맛집",
    "강남 숨은 맛집", "강남 가성비 맛집",
  ],
};

// ── helpers ──────────────────────────────────────────────────────────────────

function hr(label: string) {
  console.log(`\n${"═".repeat(65)}`);
  console.log(` ${label}`);
  console.log("═".repeat(65));
}

function sep() {
  console.log("─".repeat(65));
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🧪 Enriched Prompt Quality Test`);
  console.log(`   키워드: "${KEYWORD}"`);
  console.log(`   (Mock 분석 데이터 사용 — 실제 API 호출 없음)`);

  // 1. Show enrichment block
  hr("① Enrichment Block — AI 프롬프트에 주입되는 데이터");
  const enrichmentBlock = buildEnrichmentBlock(MOCK_DATA, "draft");
  console.log(enrichmentBlock);

  console.log(`\n📊 토큰 추정: 약 ${Math.round(enrichmentBlock.length / 3.5)}토큰`);

  // 2. Competitive analysis: without vs with enrichment
  hr("② 경쟁 분석 비교");
  console.log("\n[A] enrichment 없음 (기존 — 키워드만)");
  sep();
  const analysisWithout = await analyzeCompetition(KEYWORD);
  console.log(`  난이도: ${analysisWithout.difficulty}`);
  console.log(`  전략: ${analysisWithout.strategySummary}`);
  analysisWithout.recommendedTitles.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));

  console.log("\n[B] enrichment 있음 (데이터 기반)");
  sep();
  const analyzeEnrichment = buildEnrichmentBlock(MOCK_DATA, "analyze");
  const analysisWith = await analyzeCompetition(KEYWORD, analyzeEnrichment);
  console.log(`  난이도: ${analysisWith.difficulty}`);
  console.log(`  전략: ${analysisWith.strategySummary}`);
  analysisWith.recommendedTitles.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));

  // 3. Draft: without vs with enrichment
  hr("③ 블로그 초안 도입부 비교 (400자 미리보기)");
  console.log("\n[A] enrichment 없음");
  sep();
  const draftWithout = await generateDraft(KEYWORD, "정보성", 500);
  console.log(draftWithout.content.slice(0, 400));
  console.log("...");

  console.log("\n[B] enrichment 있음");
  sep();
  const draftWith = await generateDraft(KEYWORD, "정보성", 500, enrichmentBlock);
  console.log(draftWith.content.slice(0, 400));
  console.log("...");

  hr("✅ 완료 — A vs B 품질 차이를 비교하세요");
  console.log(`\n핵심 지표:`);
  console.log(`  - B의 제목이 상위글 패턴 / 롱테일 키워드를 반영했는지`);
  console.log(`  - B의 초안이 실제 경쟁 상황(포화도 높음)에 맞는 차별화 전략을 택했는지`);
  console.log(`  - B가 지식iN 질문(데이트용, 예약 없이)에서 파악된 사용자 니즈를 반영했는지\n`);
}

main().catch((err) => {
  console.error("❌ 오류:", err.message ?? err);
  process.exit(1);
});
