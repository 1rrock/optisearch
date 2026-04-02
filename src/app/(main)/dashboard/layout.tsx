import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "대시보드",
  description: "키워드 분석 현황과 AI 활동 요약을 한눈에 확인하세요.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
