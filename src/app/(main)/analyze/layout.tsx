import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "키워드 분석 — 검색량·경쟁도·포화지수 한번에",
  description:
    "네이버 키워드 검색량, 경쟁도, 포화지수를 실시간으로 분석하고 S+~D- 등급으로 기회 키워드를 발굴하세요. AI가 상위노출 전략까지 제안합니다.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
