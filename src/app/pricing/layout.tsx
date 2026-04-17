import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const metadata: Metadata = {
  title: "요금제 | 옵티써치",
  description: "옵티써치 요금제 비교 - 무료, 베이직(₩9,900/월), 프로 플랜. 키워드 분석, AI 콘텐츠 생성, SEO 점수 분석 기능을 비교하세요.",
  robots: { index: false, follow: true },
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
