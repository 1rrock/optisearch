import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "저장된 키워드",
  description: "저장한 키워드 목록을 관리하고 분석 결과를 다시 확인하세요.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
