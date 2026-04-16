import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "키워드 분석",
  description: "키워드 검색량, 경쟁도, 포화지수를 분석하고 AI가 최적 전략을 제안합니다.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
