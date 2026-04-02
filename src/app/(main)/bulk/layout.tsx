import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "대량 키워드 분석",
  description: "수십 개의 키워드를 한 번에 분석하고 결과를 엑셀로 추출하세요.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
