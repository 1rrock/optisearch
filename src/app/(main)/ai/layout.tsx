import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI 도구",
  description: "AI가 블로그 제목을 추천하고 SEO 최적화 글 초안을 생성합니다.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
