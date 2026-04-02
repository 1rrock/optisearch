import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "설정",
  description: "계정 설정, 구독 플랜, API 연동을 관리합니다.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
