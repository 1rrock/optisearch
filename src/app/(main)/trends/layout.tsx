import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "트렌드",
  description: "네이버 데이터랩 기반 키워드 트렌드 차트를 확인하세요.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
