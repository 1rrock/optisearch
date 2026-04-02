import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "쇼핑 인사이트",
  description: "네이버 쇼핑 키워드 검색량과 카테고리별 트렌드를 분석합니다.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
