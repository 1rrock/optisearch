
"use client";

import { useState } from "react";
import { TrendingUp, Bell } from "lucide-react";

export function RankTrackingFeature() {
  const [hoveredNode, setHoveredNode] = useState<number | null>(null); 

  const dataPoints = [
    { day: "월", rank: 42, type: "stable" },
    { day: "화", rank: 45, type: "drop" },
    { day: "수", rank: 44, type: "stable" },
    { day: "목", rank: 12, type: "leap", note: "키워드 데이터 갱신 완료" },
    { day: "금", rank: 8, type: "leap", note: "알고리즘 반영" },
    { day: "토", rank: 4, type: "leap" },
    { day: "일", rank: 3, type: "stable" },
  ];

  return (
    <section className="py-32 bg-background border-y border-border overflow-hidden relative">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnPmQ9Ik0zNiAwaDI0djYwaC0yNHYtNjB6TTAgMGgzNnY2MEgwVjB6IiBmaWxsPSIjMDkwOTA5IiBmaWxsLW9wYWNpdHk9IjAuMSIgLz48L2c+PC9zdmc+')] opacity-20"></div>

      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center relative z-10">
        
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-accent/10 border border-accent/20 text-accent text-xs font-mono tracking-widest shadow-[0_0_15px_hsl(var(--accent)/0.2)]">
            <Bell className="size-3" /> 실시간 알림
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.1]">
            매일 자동화된<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-purple-500 drop-shadow-[0_0_20px_hsl(var(--accent)/0.3)]">
              순위 변동 추적
            </span>
          </h2>
          
          <p className="text-xl text-muted-foreground font-medium leading-relaxed max-w-xl">
            관리 중인 모든 키워드의 노출 순위를 매일 자동으로 모니터링합니다. 지정 범위를 벗어나는 급격한 순위 하락이나 변동 발생 시 즉각적인 알림을 발송하여, 신속한 이슈 파악을 돕습니다.
          </p>

          <div className="pt-6 grid grid-cols-2 gap-6">
            <div className="bg-muted/50 border border-border/50 p-6 rounded-2xl">
              <div className="text-accent text-3xl font-black mb-2">24h</div>
              <div className="text-muted-foreground text-sm font-bold tracking-wide">데이터 갱신 주기</div>
            </div>
            <div className="bg-muted/50 border border-border/50 p-6 rounded-2xl">
              <div className="text-accent text-3xl font-black mb-2">10k+</div>
              <div className="text-muted-foreground text-sm font-bold tracking-wide">스토어당 키워드 분석</div>
            </div>
          </div>
        </div>

        <div className="relative h-[450px] bg-muted/30 backdrop-blur-md rounded-3xl border border-border shadow-[0_0_50px_hsl(var(--accent)/0.05)] p-8">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none rounded-3xl"></div>
          
          <div className="flex justify-between items-center mb-8 border-b border-border/50 pb-6">
            <div>
              <div className="text-foreground font-bold text-lg">&quot;러닝화&quot;</div>
              <div className="text-muted-foreground text-xs font-mono">순위 변동 • 최근 7일</div>
            </div>
            <div className="text-right">
              <div className="text-accent font-black text-2xl flex items-center gap-2">
                3위 <TrendingUp className="size-5" />
              </div>
              <div className="text-primary text-xs font-bold">+39 계단 상승</div>
            </div>
          </div>

          <div className="relative h-64 w-full mt-4 flex items-end">
            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] text-muted-foreground font-mono pb-8 -ml-2">
              <span>#1</span>
              <span>#25</span>
              <span>#50</span>
            </div>

            <div className="absolute inset-0 flex flex-col justify-between pb-8 pl-8">
              <div className="border-b border-border/50 w-full"></div>
              <div className="border-b border-border/50 w-full"></div>
              <div className="border-b border-border/50 w-full"></div>
            </div>

            <svg className="absolute inset-0 h-full w-full pl-8 pb-8" preserveAspectRatio="none">
              <path 
                d="M0,180 L80,195 L160,185 L240,40 L320,25 L400,10 L480,5" 
                fill="none" 
                stroke="url(#cyan-gradient)" 
                strokeWidth="4" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="drop-shadow-[0_0_10px_hsl(var(--accent)/0.6)]"
              />
              <defs>
                <linearGradient id="cyan-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--muted-foreground))" />
                  <stop offset="40%" stopColor="hsl(var(--accent))" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" />
                </linearGradient>
              </defs>
            </svg>

            <div className="absolute inset-0 pl-8 pb-8 flex justify-between items-end">
              {dataPoints.map((dp, i) => {
                const heightPercent = Math.max(5, 100 - (dp.rank * 2));
                
                return (
                  <div 
                    key={i} 
                    className="relative flex flex-col items-center group cursor-crosshair"
                    style={{ height: '100%' }}
                    onMouseEnter={() => setHoveredNode(i)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    <div className={`absolute top-0 bottom-0 w-px bg-border transition-opacity ${hoveredNode === i ? 'opacity-100' : 'opacity-0'}`}></div>
                    
                    <div 
                      className={`absolute w-4 h-4 rounded-full border-2 transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2
                        ${hoveredNode === i ? 'scale-150 bg-accent border-foreground shadow-[0_0_20px_hsl(var(--accent)/0.8)] z-20' : 
                        dp.type === 'leap' ? 'bg-muted border-accent z-10' : 
                        'bg-muted border-muted-foreground'}`}
                      style={{ bottom: `${heightPercent}%`, left: '50%' }}
                    ></div>

                    <div className={`absolute bottom-full mb-4 w-40 bg-muted border border-border rounded-lg p-3 shadow-2xl transition-all duration-300 z-30 pointer-events-none transform -translate-x-1/2
                      ${hoveredNode === i ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
                      style={{ bottom: `calc(${heightPercent}% + 16px)` }}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-muted-foreground text-xs font-bold">{dp.day}</span>
                        <span className={`text-sm font-black ${dp.type === 'drop' ? 'text-destructive' : 'text-accent'}`}>{dp.rank}위</span>
                      </div>
                      {dp.note && (
                        <div className="text-[10px] text-muted-foreground font-mono mt-2 pt-2 border-t border-border">
                          {dp.note}
                        </div>
                      )}
                    </div>

                    <div className="absolute bottom-[-32px] text-xs text-muted-foreground font-mono">
                      {dp.day}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
