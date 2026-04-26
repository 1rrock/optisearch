import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI 블로그 도구 — 경쟁 분석 · 초안 생성",
  description:
    "AI가 상위 글 공백 각도를 분석하고, 네이버 블로그 초안을 자동 생성합니다. 키워드 분석 결과를 바탕으로 상위노출 전략까지 제안합니다.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
