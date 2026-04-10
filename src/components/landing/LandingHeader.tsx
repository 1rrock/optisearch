"use client";

import { signIn } from "next-auth/react";
import { useIsAuthenticated } from "@/shared/hooks/use-user";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/shared/ui/button";

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

export function LandingHeader() {
  return (
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
          <a href="/#features" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors tracking-wide">핵심 기능</a>
          <a href="/pricing" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors tracking-wide">요금제</a>
          <a href="/support" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors tracking-wide">고객지원</a>
        </div>

        <div className="flex items-center gap-4">
          <AuthNav />
        </div>
      </div>
    </nav>
  );
}
