
"use client";

import Script from "next/script";
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
