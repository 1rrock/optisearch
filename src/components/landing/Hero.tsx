
"use client";

import { ArrowRight, Play, Search, TrendingUp } from "lucide-react";
import { Button } from "@/shared/ui/button";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/shared/ui/input";

export function Hero() {
  const [storeUrl, setStoreUrl] = useState("");
  const router = useRouter();

  return (
    <div className="relative bg-background pt-32 pb-40 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 items-center relative z-10 w-full">

        <div className="lg:col-span-7 space-y-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-primary/10 border border-primary/20 text-primary text-xs font-mono tracking-widest shadow-[0_0_15px_hsl(var(--primary)/0.2)] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            네이버 검색 데이터 분석 플랫폼
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-black tracking-tighter leading-[1.05] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 text-foreground">
            감으로 하지 마세요.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent drop-shadow-[0_0_30px_hsl(var(--primary)/0.3)]">
              데이터로 결정하세요.
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-2xl font-medium animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            네이버 검색광고 API 기반의 키워드 분석 소프트웨어. 검색량, 경쟁 강도, 순위 변동을 하나의 대시보드에서 조회하고 의사결정에 활용하세요.
          </p>
        </div>

        <div className="lg:col-span-5 relative mt-16 lg:mt-0 animate-in fade-in slide-in-from-right-8 duration-1000 delay-300 h-full min-h-[400px] flex items-center justify-center perspective-[1000px]">

          <div className="relative w-full max-w-md bg-background/80 backdrop-blur-2xl rounded-2xl border border-border/80 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform-gpu rotate-y-[-5deg] rotate-x-[5deg] hover:rotate-y-0 hover:rotate-x-0 transition-transform duration-500">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-muted border border-border rounded-full text-[10px] font-mono text-muted-foreground tracking-wider z-20">시뮬레이션 예시</div>
            <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center">
                  <Search className="size-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-mono mb-1">타겟 키워드</div>
                  <div className="text-foreground font-bold tracking-tight">&quot;남자 트레일 러닝화&quot;</div>
                </div>
              </div>
              <div className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-sm text-xs font-black tracking-widest">
                참고 지표
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-2 font-mono">
                  <span>현재 순위</span>
                  <span>시뮬레이션 순위</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-muted rounded-lg p-3 border border-border text-center relative overflow-hidden">
                    <span className="text-2xl font-black text-muted-foreground line-through decoration-destructive/50">45위</span>
                  </div>
                  <ArrowRight className="size-5 text-muted-foreground" />
                  <div className="flex-1 bg-primary/10 rounded-lg p-3 border border-primary/30 text-center relative overflow-hidden shadow-[inset_0_0_20px_hsl(var(--primary)/0.1)]">
                    <span className="text-3xl font-black text-primary drop-shadow-[0_0_10px_hsl(var(--primary)/0.8)]">3위</span>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">예상 클릭수 변동</span>
                  <span className="text-primary text-xs font-bold bg-primary/10 px-2 py-0.5 rounded">데이터 기반 추산</span>
                </div>
                <div className="flex items-end gap-3">
                  <span className="text-3xl font-black text-foreground">+1,245건</span>
                  <span className="text-sm text-muted-foreground font-mono mb-1">/ 월 예상</span>
                </div>

                <div className="mt-4 flex items-end gap-1 h-12">
                  {[30, 45, 35, 50, 40, 60, 75, 65, 80, 100].map((h, i) => (
                    <div key={i} className="flex-1 bg-primary/20 rounded-t-sm" style={{ height: `${h}%` }}>
                      <div className="w-full h-1 bg-primary rounded-t-sm shadow-[0_0_5px_hsl(var(--primary)/0.5)]"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="absolute -right-6 top-1/4 bg-muted border border-border p-3 rounded-xl shadow-2xl animate-bounce" style={{ animationDuration: '4s' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <TrendingUp className="size-4" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-mono">순위 변동 감지</p>
                <p className="text-sm font-bold text-foreground">시장 동향 분석</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
