
"use client";

import { signIn } from "next-auth/react";
import { useIsAuthenticated } from "@/shared/hooks/use-user";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/shared/ui/button";

import { Hero } from "@/components/landing/Hero";
import { SocialProof } from "@/components/landing/SocialProof";
import { ProblemPivot } from "@/components/landing/ProblemPivot";
import { ProfitScoringFeature } from "@/components/landing/ProfitScoringFeature";
import { RankTrackingFeature } from "@/components/landing/RankTrackingFeature";
import { Workflow } from "@/components/landing/Workflow";
import { PricingSection } from "@/components/landing/PricingSection";
import { CTABlock } from "@/components/landing/CTABlock";

function AuthNav() {
  const { isAuthenticated, loading: sessionLoading } = useIsAuthenticated();
  const isLoggedIn = isAuthenticated && !sessionLoading;


  return isLoggedIn ? (
    <a href="/dashboard">
      <Button className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_hsl(var(--primary)/0.4)] hover:scale-[1.02] transition-all px-6 h-12">
        대시보드
      </Button>
    </a>
  ) : (
    <>
      <Button variant="ghost" className="hidden sm:flex rounded-xl font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 h-12 px-6" onClick={() => signIn()}>
        로그인
      </Button>
      <a href="/login">
        <Button className="rounded-xl font-bold bg-foreground text-background shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-zinc-200 hover:scale-[1.02] transition-all px-6 h-12">
          무료 체험 시작
        </Button>
      </a>
    </>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 overflow-x-hidden font-sans">

      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-[0_0_15px_hsl(var(--primary)/0.3)] bg-muted flex items-center justify-center p-1 border border-border">
                <Image src="/logo.png" alt="OptiSearch Logo" width={32} height={32} className="w-full h-full object-cover rounded-lg" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-foreground drop-shadow-md">
                OptiSearch
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors tracking-wide">핵심 기능</a>
            <a href="/support" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors tracking-wide">고객지원</a>
            <a href="#pricing" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors tracking-wide">요금제</a>
          </div>

          <div className="flex items-center gap-4">
            <AuthNav />
          </div>
        </div>
      </nav>

      <main>
        <Hero />
        <SocialProof />
        <ProblemPivot />
        <ProfitScoringFeature />
        <RankTrackingFeature />
        <Workflow />
        <PricingSection />
        <CTABlock />
      </main>

      <footer className="bg-background py-12 border-t border-border relative z-10">
        <div className="max-w-7xl mx-auto px-6 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted border border-border p-1 flex items-center justify-center grayscale opacity-70">
                <Image src="/logo.png" alt="OptiSearch Logo" width={20} height={20} className="w-full h-full object-cover rounded" />
              </div>
              <span className="font-black text-xl text-muted-foreground tracking-tight">OptiSearch</span>
            </div>

            <div className="flex items-center gap-8 text-sm font-bold text-muted-foreground">
              <a href="/terms" className="hover:text-foreground transition-colors">이용약관</a>
              <a href="/privacy" className="hover:text-foreground transition-colors">개인정보처리방침</a>
              <a href="/support" className="hover:text-foreground transition-colors">고객지원</a>
            </div>
          </div>

          <div className="border-t border-border/50 pt-8 text-xs text-muted-foreground font-mono flex flex-col md:flex-row justify-between items-center gap-4">
            <p>네이버 키워드 데이터 분석 소프트웨어 © 2026</p>
            <div className="text-right">
              <p>OptiSearch Inc. | 사업자등록번호: 570-01-03731 | 대표: 최원락</p>
              <p className="mt-1">문의: <a href="http://pf.kakao.com/_CupuX" target="_blank" rel="noopener noreferrer" className="underline hover:text-muted-foreground">카카오톡 채널</a></p>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
