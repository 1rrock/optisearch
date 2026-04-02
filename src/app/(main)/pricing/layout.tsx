import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "요금제",
  description: "옵티써치 무료 및 유료 요금제를 비교하고 최적의 플랜을 선택하세요.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
