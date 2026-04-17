
"use client";

import Script from "next/script";
import Link from "next/link";
import { Hero } from "@/components/landing/Hero";
import { SocialProof } from "@/components/landing/SocialProof";
import { ProblemPivot } from "@/components/landing/ProblemPivot";
import { ProfitScoringFeature } from "@/components/landing/ProfitScoringFeature";
import { RankTrackingFeature } from "@/components/landing/RankTrackingFeature";
import { Workflow } from "@/components/landing/Workflow";
import { CTABlock } from "@/components/landing/CTABlock";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 overflow-x-hidden font-sans">
      <Script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9970402588626346" crossOrigin="anonymous" strategy="afterInteractive" />

      <LandingHeader />

      <main>
        <Hero />

        {/* 무료 도구 소개 섹션 */}
        <section className="py-16 md:py-24 px-6">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold">무료로 바로 사용해보세요</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                로그인 없이 하루 몇 회씩 제공되는 무료 도구로 옵티써치의 분석 품질을 먼저 경험해보세요.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                { href: "/tools/keyword-analyzer", title: "키워드 분석기", desc: "검색량·경쟁도·등급을 즉시 확인", dailyLimit: "하루 5회 무료" },
                { href: "/tools/title-generator", title: "AI 제목 생성기", desc: "SEO에 최적화된 제목 3개 자동 생성", dailyLimit: "하루 3회 무료" },
                { href: "/tools/seo-checker", title: "SEO 점수 분석기", desc: "글의 SEO 점수와 개선 포인트 진단", dailyLimit: "하루 5회 무료" },
                { href: "/tools/trend-checker", title: "트렌드 분석기", desc: "3개월 검색량 추이 시각화", dailyLimit: "하루 3회 무료" },
              ].map(tool => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group p-6 rounded-xl border hover:border-foreground/40 hover:bg-muted/30 transition-colors space-y-3"
                >
                  <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{tool.title}</h3>
                  <p className="text-sm text-muted-foreground">{tool.desc}</p>
                  <p className="text-xs font-medium text-primary">{tool.dailyLimit} →</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <SocialProof />
        <ProblemPivot />
        <ProfitScoringFeature />
        <RankTrackingFeature />
        <Workflow />
        <CTABlock />
      </main>

      <LandingFooter />

    </div>
  );
}
