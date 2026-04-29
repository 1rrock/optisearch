
"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Crosshair, BarChart2, User } from "lucide-react";

export function ProfitScoringFeature() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-32 bg-background border-t border-border overflow-hidden" ref={containerRef}>
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">

        <div className="order-2 lg:order-1 relative">
          <div className="absolute inset-0 bg-primary/10 blur-[100px] rounded-full pointer-events-none"></div>

          <div className="relative bg-muted/30 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center mb-8 border-b border-border/80 pb-4">
              <span className="text-sm font-mono text-muted-foreground tracking-wider">키워드 가치 분석</span>
              <div className="flex gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-border"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-border"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-primary/50 animate-pulse"></span>
              </div>
            </div>

            <div className="space-y-8">
              <div className={`transition-all duration-1000 ${isVisible ? 'opacity-20 scale-95 blur-sm translate-y-4' : 'opacity-100 scale-100 blur-0'}`}>
                <div className="flex items-center justify-between bg-muted border border-border rounded-xl p-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-destructive/80 font-mono mb-1">검색량 큰 키워드</span>
                    <span className="text-xl font-bold text-muted-foreground">&quot;강아지&quot;</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground font-mono mb-1">진입 점수</div>
                    <div className="text-2xl font-black text-destructive/80">14</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center -my-2 relative z-10">
                <div className={`w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center transition-all duration-1000 delay-300 ${isVisible ? 'rotate-90 opacity-100' : 'rotate-0 opacity-0'}`}>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </div>
              </div>

              <div className={`transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-95 blur-sm -translate-y-4'}`}>
                <div className="bg-primary/5 border border-primary/30 rounded-xl p-6 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                      <span className="text-xs text-primary font-mono mb-1 font-bold tracking-widest drop-shadow-[0_0_5px_hsl(var(--primary)/0.5)]">내가 들어갈 키워드</span>
                      <span className="text-xl font-black text-foreground">&quot;강아지 사료 추천&quot;</span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-sm font-bold text-muted-foreground">진입 점수</span>
                      <span className="text-4xl font-black text-primary drop-shadow-[0_0_15px_hsl(var(--primary)/0.8)]">
                        {isVisible ? '98' : '0'}
                      </span>
                    </div>
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden border border-border">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1500 ease-out shadow-[0_0_10px_hsl(var(--primary)/0.8)]"
                        style={{ width: isVisible ? '98%' : '0%' }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-6 border-t border-border/50 pt-4">
                    <div>
                      <div className="text-[10px] text-muted-foreground font-mono mb-1 flex items-center gap-1"><Crosshair className="size-3" /> 경쟁 강도</div>
                      <div className="text-primary font-bold">낮음</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground font-mono mb-1 flex items-center gap-1"><BarChart2 className="size-3" /> 포화 지수</div>
                      <div className="text-primary font-bold">0.18</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground font-mono mb-1 flex items-center gap-1"><User className="size-3" /> 개인 블로그</div>
                      <div className="text-primary font-bold">3개+</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2 space-y-8">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.1]">
            숫자만 보고 막막했던 <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-muted-foreground to-foreground">키워드 해석을 자연어로</span>
          </h2>
          <p className="text-xl text-muted-foreground font-medium leading-relaxed max-w-xl">
            검색량과 경쟁도, 콘텐츠 포화 지수를 종합해서 &apos;이 키워드는 어떤 상황에 적합한지&apos;, &apos;먼저 노릴 연관 키워드는 무엇인지&apos;까지 <span className="text-foreground font-bold">자연어로 풀어드려요</span>.
          </p>
          <p className="text-lg text-muted-foreground max-w-xl">
            막연한 감이 아닌 데이터 기반으로, 1인 블로거가 비집고 들어갈 자리를 정확히 알려드립니다.
          </p>
        </div>

      </div>
    </section>
  );
}
