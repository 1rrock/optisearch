import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const metadata: Metadata = {
  title: "요금제 비교 — 무료·베이직·프로 | 옵티써치",
  description:
    "옵티써치 요금제 비교. 무료 플랜으로 키워드 분석 10회/일 제공, 베이직(₩9,900/월)으로 AI 경쟁분석·초안생성 해금. 14일 Pro 무료 체험 가능.",
  openGraph: {
    title: "요금제 비교 | 옵티써치",
    description: "무료로 시작, 14일 Pro 체험. 키워드 분석·AI 블로그 도구 요금제 비교.",
    url: "https://www.optisearch.kr/pricing",
    type: "website",
  },
  alternates: {
    canonical: "https://www.optisearch.kr/pricing",
  },
  robots: { index: true, follow: true },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <LandingHeader />
      <div className="max-w-6xl mx-auto px-6 pt-28 pb-12 flex-1 w-full">
        {children}
      </div>
      <LandingFooter />
    </div>
  );
}
