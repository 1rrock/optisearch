"use client";

import { useIsAuthenticated } from "@/shared/hooks/use-user";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/shared/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

function AnnouncementBar() {
  const { isAuthenticated, loading } = useIsAuthenticated();
  if (loading || isAuthenticated) return null;
  return (
    <div className="w-full bg-primary text-primary-foreground text-center py-2 px-4 text-xs sm:text-sm font-bold tracking-wide">
      🎉 신규 가입 시 프로 플랜 <span className="underline underline-offset-2">14일 무료 체험</span> — 카드 등록 불필요
      <a href="/login" className="ml-3 inline-flex items-center gap-1 bg-primary-foreground/20 hover:bg-primary-foreground/30 rounded-full px-3 py-0.5 text-xs font-black transition-colors">
        지금 시작 →
      </a>
    </div>
  );
}

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
      <Link href="/login">
        <Button variant="ghost" className="hidden sm:flex rounded-xl font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 h-12 px-6">
          로그인
        </Button>
      </Link>
      <a href="/login">
        <Button className="rounded-xl font-bold bg-foreground text-background shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-zinc-200 hover:scale-[1.02] transition-all px-6 h-12">
          무료 체험 시작
        </Button>
      </a>
    </>
  );
}

const FREE_TOOLS = [
  { label: "키워드 분석기", href: "/tools/keyword-analyzer" },
  { label: "AI 제목 생성기", href: "/tools/title-generator" },
  { label: "SEO 점수 분석기", href: "/tools/seo-checker" },
  { label: "트렌드 분석기", href: "/tools/trend-checker" },
];

export function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 transition-all duration-300">
      <AnnouncementBar />
      <div className="bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
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

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {/* 무료 도구 드롭다운 */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors tracking-wide outline-none">
                무료 도구
                <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48" align="start">
              {FREE_TOOLS.map((tool) => (
                <DropdownMenuItem key={tool.href} asChild>
                  <Link href={tool.href} className="cursor-pointer">
                    {tool.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 가이드 */}
          <Link href="/guides" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors tracking-wide">
            가이드
          </Link>

          <a href="/#features" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors tracking-wide">핵심 기능</a>
          <a href="/pricing" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors tracking-wide">요금제</a>
          <a href="/support" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors tracking-wide">고객지원</a>
        </div>

        {/* Right: Auth + Mobile Toggle */}
        <div className="flex items-center gap-4">
          <AuthNav />
          {/* 모바일 햄버거 */}
          <button
            className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="메뉴 열기"
          >
            <span className={`block w-5 h-0.5 bg-foreground transition-all duration-200 ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-5 h-0.5 bg-foreground transition-all duration-200 ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-0.5 bg-foreground transition-all duration-200 ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
      </div>

      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl px-6 py-4 flex flex-col gap-1">
          {/* 무료 도구 아코디언 */}
          <button
            className="flex items-center justify-between w-full py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors tracking-wide"
            onClick={() => setMobileToolsOpen((v) => !v)}
          >
            무료 도구
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${mobileToolsOpen ? "rotate-180" : ""}`} />
          </button>
          {mobileToolsOpen && (
            <div className="pl-4 flex flex-col gap-1 mb-1">
              {FREE_TOOLS.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {tool.label}
                </Link>
              ))}
            </div>
          )}

          <Link href="/guides" className="py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors tracking-wide" onClick={() => setMobileOpen(false)}>
            가이드
          </Link>
          <a href="/#features" className="py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors tracking-wide" onClick={() => setMobileOpen(false)}>핵심 기능</a>
          <a href="/pricing" className="py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors tracking-wide" onClick={() => setMobileOpen(false)}>요금제</a>
          <a href="/support" className="py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors tracking-wide" onClick={() => setMobileOpen(false)}>고객지원</a>
        </div>
      )}
    </nav>
  );
}
