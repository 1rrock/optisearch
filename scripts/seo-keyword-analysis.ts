/**
 * OptiSearch SEO 키워드 분석 스크립트
 * keyword-service를 직접 호출하여 타겟 키워드 분석
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local") });

// 네이버 SearchAd API 직접 호출
const API_BASE = "https://api.searchad.naver.com";
const CUSTOMER_ID = process.env.NAVER_SEARCHAD_CUSTOMER_ID!;
const API_KEY = process.env.NAVER_SEARCHAD_API_KEY!;
const SECRET_KEY = process.env.NAVER_SEARCHAD_SECRET_KEY!;

import crypto from "crypto";

function getSignature(timestamp: string, method: string, path: string): string {
  const message = `${timestamp}.${method}.${path}`;
  return crypto.createHmac("sha256", SECRET_KEY).update(message).digest("base64");
}

async function getKeywordStats(keywords: string[]): Promise<Record<string, { pc: number; mobile: number; total: number; competition: string }>> {
  const timestamp = String(Date.now());
  const method = "GET";
  const path = "/keywordstool";
  const signature = getSignature(timestamp, method, path);

  const params = new URLSearchParams({
    hintKeywords: keywords.join(","),
    showDetail: "1",
  });

  const res = await fetch(`${API_BASE}${path}?${params}`, {
    headers: {
      "X-Timestamp": timestamp,
      "X-API-KEY": API_KEY,
      "X-Customer": CUSTOMER_ID,
      "X-Signature": signature,
    },
  });

  if (!res.ok) {
    console.error(`SearchAd API error: ${res.status}`);
    return {};
  }

  const data = await res.json();
  const result: Record<string, { pc: number; mobile: number; total: number; competition: string }> = {};

  for (const item of data.keywordList || []) {
    const kw = item.relKeyword;
    if (keywords.includes(kw)) {
      const pc = item.monthlyPcQcCnt === "< 10" ? 5 : Number(item.monthlyPcQcCnt) || 0;
      const mobile = item.monthlyMobileQcCnt === "< 10" ? 5 : Number(item.monthlyMobileQcCnt) || 0;
      result[kw] = {
        pc,
        mobile,
        total: pc + mobile,
        competition: item.compIdx || "낮음",
      };
    }
  }

  return result;
}

async function main() {
  console.log("🔍 OptiSearch SEO 타겟 키워드 분석\n");

  // OptiSearch가 타겟해야 할 핵심 키워드
  const targetKeywords = [
    // 메인 키워드
    "키워드 분석",
    "키워드 분석 도구",
    "키워드 분석기",
    "네이버 키워드 분석",
    "키워드 검색량",
    "키워드 검색량 조회",
    // 무료 도구 키워드
    "블로그 제목 추천",
    "블로그 제목 생성기",
    "AI 블로그 글쓰기",
    "블로그 SEO",
    "블로그 SEO 체크",
    "키워드 트렌드",
    // 경쟁사 대안 키워드
    "블랙키위 대안",
    "블랙키위 무료",
    // 기능 키워드
    "AI 블로그 초안",
    "블로그 키워드 추천",
    "네이버 블로그 상위노출",
    "콘텐츠 최적화",
    // 롱테일
    "키워드 경쟁도 분석",
    "블로그 수익화",
  ];

  const stats = await getKeywordStats(targetKeywords);

  console.log("=".repeat(80));
  console.log(`${"키워드".padEnd(30)} | ${"PC".padStart(8)} | ${"모바일".padStart(8)} | ${"합계".padStart(8)} | 경쟁도`);
  console.log("─".repeat(80));

  const sortedEntries = Object.entries(stats).sort((a, b) => b[1].total - a[1].total);

  for (const [kw, data] of sortedEntries) {
    console.log(
      `${kw.padEnd(30)} | ${String(data.pc).padStart(8)} | ${String(data.mobile).padStart(8)} | ${String(data.total).padStart(8)} | ${data.competition}`
    );
  }

  // 검색되지 않은 키워드
  const missing = targetKeywords.filter(kw => !stats[kw]);
  if (missing.length > 0) {
    console.log(`\n⚠️  데이터 없는 키워드: ${missing.join(", ")}`);
  }

  console.log("\n✅ 분석 완료!");
}

main().catch(console.error);
