import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "키워드 비교",
  description: "여러 키워드를 한 번에 비교하여 최적의 키워드를 선택하세요.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
