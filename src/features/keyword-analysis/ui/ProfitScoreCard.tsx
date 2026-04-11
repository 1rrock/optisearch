import type { ProfitSignal } from "@/entities/keyword/model/types";
import { Coins } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { ProfitCompetitionLevel } from "../api/use-profit";

interface ProfitScoreCardProps {
  score?: number;
  signal?: ProfitSignal;
  competition?: ProfitCompetitionLevel;
  isLoading?: boolean;
  errorMessage?: string | null;
  roas?: {
    value: number;
    score: number;
    monthlyAdSpend: number;
    monthlyAdRevenue: number;
    signal: "HIGH" | "MEDIUM" | "LOW";
  };
}

const SIGNAL_LABEL: Record<ProfitSignal, string> = {
  HIGH: "기회 높음",
  MEDIUM: "기회 보통",
  LOW: "기회 낮음",
};

const COMPETITION_LABEL: Record<ProfitCompetitionLevel, string> = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
};

const COMPETITION_BAR_WIDTH: Record<ProfitCompetitionLevel, string> = {
  LOW: "30%",
  MEDIUM: "55%",
  HIGH: "85%",
};

const COMPETITION_BAR_CLASS: Record<ProfitCompetitionLevel, string> = {
  LOW: "bg-emerald-500",
  MEDIUM: "bg-amber-500",
  HIGH: "bg-rose-500",
};

export function ProfitScoreCard({
  score,
  signal,
  competition,
  isLoading,
  errorMessage,
  roas,
}: ProfitScoreCardProps) {
  const scoreTone = signal === "HIGH" ? "text-emerald-500" : signal === "MEDIUM" ? "text-amber-500" : "text-rose-500";
  const bgTone = signal === "HIGH" ? "bg-emerald-500/10" : signal === "MEDIUM" ? "bg-amber-500/10" : "bg-rose-500/10";

  return (
    <div className="bg-card/40 backdrop-blur-sm text-card-foreground p-7 rounded-[2rem] shadow-sm border border-muted/50 hover:border-primary/30 transition-all h-full relative overflow-hidden flex flex-col group">
      <div className="absolute top-0 right-0 p-6 opacity-[0.03] dark:opacity-[0.02] pointer-events-none blur-[2px] group-hover:opacity-[0.06] transition-opacity">
        <Coins className="size-20 rotate-12" />
      </div>
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2 py-1 bg-orange-500/10 text-orange-500 text-[10px] font-black rounded-lg uppercase tracking-wider">Potential</span>
        </div>
        <p className="text-sm font-bold text-muted-foreground mb-4">수익성 및 기회</p>

        {isLoading && score === undefined ? (
          <>
            <div className="h-10 w-24 bg-muted/50 rounded-xl mb-4 animate-pulse" />
            <p className="text-[11px] text-muted-foreground">시세 데이터 분석 중...</p>
          </>
        ) : (
          <div className="flex flex-col flex-1 gap-6">
            {/* Header with Score */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mb-1">Profitability Score</span>
                <h2 className={cn("text-4xl font-black tracking-tighter", scoreTone)}>
                  {score ?? "-"}
                </h2>
              </div>
              {signal && (
                <span className={cn("px-2.5 py-1 text-[11px] font-black rounded-lg uppercase border border-current shadow-sm", scoreTone, bgTone)}>
                  {SIGNAL_LABEL[signal]}
                </span>
              )}
            </div>

            {/* ROAS Highlight */}
            <div className="relative p-5 rounded-[1.5rem] bg-gradient-to-br from-muted/20 to-muted/40 border border-muted/30 overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-muted-foreground">예상 ROAS</span>
                  {roas ? (
                    <span className={cn(
                      "px-2.5 py-1 text-[11px] font-black rounded-lg text-white shadow-md",
                      roas.signal === "HIGH" ? "bg-emerald-500" : roas.signal === "MEDIUM" ? "bg-amber-500" : "bg-rose-500"
                    )}>
                      {roas.value}x
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-muted-foreground/40 italic">준비 중</span>
                  )}
                </div>
                
                {roas ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-black uppercase mb-1 tracking-widest">Ad Spend</p>
                      <p className="text-base font-black tabular-nums">{roas.monthlyAdSpend.toLocaleString("ko-KR")}원</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground font-black uppercase mb-1 tracking-widest">Revenue</p>
                      <p className="text-base font-black tabular-nums">{roas.monthlyAdRevenue.toLocaleString("ko-KR")}원</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground/60 leading-snug font-medium">
                    추천 입찰가 정보 수집 후<br />자동 계산되어 활성화됩니다.
                  </p>
                )}
              </div>
            </div>

            {/* Competition Indicator */}
            <div className="mt-auto space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">경쟁 강도</span>
                <span className={cn("text-xs font-black uppercase", scoreTone)}>
                  {competition ? COMPETITION_LABEL[competition] : "-"}
                </span>
              </div>
              <div className="w-full h-2.5 bg-muted/50 rounded-full overflow-hidden p-0.5 border border-muted/30">
                {competition && (
                  <div
                    className={cn("h-full rounded-full transition-all duration-1000", COMPETITION_BAR_CLASS[competition])}
                    style={{ width: COMPETITION_BAR_WIDTH[competition] }}
                  />
                )}
              </div>
            </div>

            {errorMessage && (
              <p className="text-[10px] text-rose-500 bg-rose-500/5 p-3 rounded-xl border border-rose-500/20 font-medium">{errorMessage}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
