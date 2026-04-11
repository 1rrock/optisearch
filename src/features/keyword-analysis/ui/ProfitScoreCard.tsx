import type { ProfitSignal } from "@/entities/keyword/model/types";
import { cn } from "@/shared/lib/utils";
import type { ProfitCompetitionLevel } from "../api/use-profit";

interface ProfitScoreCardProps {
  score?: number;
  signal?: ProfitSignal;
  competition?: ProfitCompetitionLevel;
  isLoading?: boolean;
  errorMessage?: string | null;
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
}: ProfitScoreCardProps) {
  const scoreTone = signal === "HIGH" ? "text-emerald-400" : "text-cyan-400";

  return (
    <div className="bg-card text-card-foreground p-6 rounded-xl shadow-sm border border-muted/50 overflow-hidden">
      <p className="text-sm font-bold text-muted-foreground mb-2">수익성 점수</p>

      {isLoading && score === undefined ? (
        <>
          <div className="h-8 w-24 bg-muted rounded mb-4 animate-pulse" />
          <p className="text-[11px] text-muted-foreground">수익성 스코어 계산 중...</p>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <h2
              className={cn(
                "text-2xl 2xl:text-3xl font-extrabold tracking-tight drop-shadow-[0_0_10px_rgba(34,211,238,0.45)] truncate",
                signal === "HIGH" && "drop-shadow-[0_0_10px_rgba(52,211,153,0.45)]",
                scoreTone,
              )}
            >
              {score ?? "-"}
            </h2>
            {signal && (
              <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-full bg-muted/40 whitespace-nowrap shrink-0", scoreTone)}>
                {SIGNAL_LABEL[signal]}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-muted-foreground">경쟁 강도</span>
              <span className={cn("font-bold", scoreTone)}>
                {competition ? COMPETITION_LABEL[competition] : "-"}
              </span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              {competition && (
                <div
                  className={cn("h-full", COMPETITION_BAR_CLASS[competition])}
                  style={{ width: COMPETITION_BAR_WIDTH[competition] }}
                />
              )}
            </div>
            {errorMessage && (
              <p className="text-[11px] text-rose-500">{errorMessage}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
