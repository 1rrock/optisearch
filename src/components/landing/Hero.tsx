
"use client";

import { ArrowRight, HelpCircle, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <div className="relative bg-background pt-32 pb-40 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 items-center relative z-10 w-full">

        <div className="lg:col-span-7 space-y-10">
          <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-primary/10 border border-primary/20 text-primary text-xs font-mono tracking-widest shadow-[0_0_15px_hsl(var(--primary)/0.2)]">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              네이버 블로그 글쓰기 도구
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-black tracking-wide shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              🎉 가입 즉시 Pro 2주 무료
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-black tracking-tighter leading-[1.05] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 text-foreground">
            검색량 조회는<br />
            어디서나 공짜예요.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent drop-shadow-[0_0_30px_hsl(var(--primary)/0.3)]">
              우리는 질문을 읽어요.
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-2xl font-medium animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            네이버 지식iN에 실제로 올라온 질문을 읽고, 그 각도로 글 초안을 씁니다. ChatGPT는 지식iN을 못 봅니다. 검색량·경쟁도 조회는 덤으로 따라옵니다.
          </p>
        </div>

        <div className="lg:col-span-5 relative mt-16 lg:mt-0 animate-in fade-in slide-in-from-right-8 duration-1000 delay-300 h-full min-h-[400px] flex items-center justify-center perspective-[1000px]">

          <div className="relative w-full max-w-md bg-background/80 backdrop-blur-2xl rounded-2xl border border-border/80 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform-gpu rotate-y-[-5deg] rotate-x-[5deg] hover:rotate-y-0 hover:rotate-x-0 transition-transform duration-500">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-muted border border-border rounded-full text-[10px] font-mono text-muted-foreground tracking-wider z-20">실제 데이터 예시</div>
            <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center">
                  <HelpCircle className="size-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-mono mb-1">키워드</div>
                  <div className="text-foreground font-bold tracking-tight">&quot;강아지 사료 추천&quot;</div>
                </div>
              </div>
              <div className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-sm text-xs font-black tracking-widest">
                지식iN
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                <div className="text-[11px] text-muted-foreground font-mono mb-2">지식iN에 실제로 올라온 질문</div>
                <p className="text-foreground font-bold leading-snug">
                  &quot;알러지있는 강아지 사료 추천 좀 해주세요&quot;
                </p>
              </div>

              <div className="flex items-center justify-center py-1">
                <ArrowRight className="size-5 text-muted-foreground rotate-90" />
              </div>

              <div className="bg-primary/10 rounded-xl p-4 border border-primary/30 shadow-[inset_0_0_20px_hsl(var(--primary)/0.1)]">
                <div className="flex items-center gap-1.5 text-[11px] text-primary font-mono mb-2">
                  <Sparkles className="size-3" /> AI 초안 소제목
                </div>
                <p className="text-primary font-black text-lg leading-snug drop-shadow-[0_0_10px_hsl(var(--primary)/0.3)]">
                  알러지와 눈물 관리
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
