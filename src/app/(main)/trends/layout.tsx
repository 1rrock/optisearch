import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "키워드 트렌드 — 검색량 추이 차트",
  description:
    "키워드 검색량의 시간별 변화를 차트로 확인하세요. 시즌 키워드 타이밍을 잡고 상승 트렌드를 선점하여 블로그 상위노출을 노릴 수 있습니다.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
