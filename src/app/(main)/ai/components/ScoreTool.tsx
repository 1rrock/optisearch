"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Target,
  CheckCircle2,
  AlertCircle,
  PieChart,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { UsageLimitError, parseUsageLimitError } from "@/shared/lib/errors";
import { UsageBar, PlanLockOverlay, type UpgradeModalState } from "./shared";

// ─── API response types ────────────────────────────────────────────────────────

interface SubMetrics {
  keywordUsage: number;
  readability: number;
  structure: number;
  depth: number;
  titleAttractiveness: number;
}

interface ScoreContent {
  totalScore: number;
  grade: string;
  subMetrics: SubMetrics;
  improvements: string[];
  strengths: string[];
}

interface ScoreResponse {
  score: ScoreContent;
}

// ─── ScoreTool ────────────────────────────────────────────────────────────────

export function ScoreTool({
  onGoToDraft,
  onUsageLimitExceeded,
  used,
  limit,
  onMutationSuccess,
  initialKeyword,
}: {
  onGoToDraft?: (title?: string) => void;
  onUsageLimitExceeded: (state: UpgradeModalState) => void;
  used: number;
  limit: number;
  onMutationSuccess: () => void;
  initialKeyword?: string;
}) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(initialKeyword ?? "");
  const [content, setContent] = useState("");

  const mutation = useMutation<ScoreResponse, Error, { keyword: string; content: string }>({
    mutationFn: async (payload) => {
      const res = await fetch("/api/ai/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const limitErr = parseUsageLimitError(res.status, data);
        if (limitErr) throw limitErr;
        throw new Error(data.error ?? "점수 분석 요청에 실패했습니다.");
      }
      return res.json() as Promise<ScoreResponse>;
    },
    onError: (err) => {
      if (err instanceof UsageLimitError) {
        onUsageLimitExceeded({ feature: "콘텐츠 점수", used: err.used, limit: err.limit });
      }
    },
    onSuccess: () => {
      onMutationSuccess();
      toast.success("분석이 완료되었습니다");
    },
  });

  const handleAnalyze = () => {
    if (!keyword.trim() || !content.trim()) return;
    mutation.mutate({ keyword: keyword.trim(), content: content.trim() });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!mutation.isPending) handleAnalyze();
    }
  };

  const score = mutation.data?.score;

  // strokeDashoffset = 552.9 - (552.9 * score / 100)
  const dashOffset = score ? 552.9 - (552.9 * score.totalScore) / 100 : 552.9;

  const gradeBase = score?.grade?.charAt(0) ?? "";
  const svgColor = score
    ? gradeBase === "S" || gradeBase === "A" ? "text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
      : gradeBase === "B" ? "text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]"
      : gradeBase === "C" ? "text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]"
      : "text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]"
    : "text-muted-foreground/30";

  const gradeColor = (grade: string) => {
    const base = grade.charAt(0);
    if (base === "A" || base === "S") return "text-emerald-500";
    if (base === "B") return "text-blue-500";
    if (base === "C") return "text-amber-500";
    return "text-rose-500";
  };

  return (
    <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in slide-in-from-bottom-4 duration-500">
      {limit === 0 && (
        <PlanLockOverlay featureName="콘텐츠 점수" onUpgrade={() => router.push("/pricing")} />
      )}
      {/* Left Input */}
      <section className="col-span-1 lg:col-span-5 space-y-6">
        <div className="bg-card rounded-2xl p-8 shadow-sm border border-muted/50">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Target className="size-6 text-rose-500" /> SEO 최적화 점수 측정
            </h2>
            <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-lg uppercase">v2.0 AI Engine</span>
          </div>

          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-sm font-bold">목표 메인 키워드</label>
              <input
                className="w-full px-4 py-3 bg-muted/20 border border-muted/30 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm font-medium"
                placeholder="타겟으로 할 키워드를 하나만 입력하세요"
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>

            <div className="space-y-3 relative">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold">분석할 블로그 본문</label>
                <span className="text-xs font-bold text-primary">{content.length > 0 ? `현재 ${content.replace(/\s/g, "").length.toLocaleString()}자` : ""}</span>
              </div>
              <textarea
                className="w-full px-6 py-5 bg-muted/20 border border-muted/30 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none text-sm leading-8 min-h-[300px]"
                placeholder="작성한 초안을 붙여넣으세요"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-muted/20">
              <Button
                size="lg"
                className="px-10 rounded-xl font-extrabold bg-primary text-primary-foreground border-none shadow-xl shadow-primary/20 hover:scale-[1.03] transition-transform flex items-center gap-2"
                onClick={handleAnalyze}
                disabled={mutation.isPending || !keyword.trim() || content.replace(/\s/g, "").length < 10}
              >
                <PieChart className="size-5" />
                {mutation.isPending ? "분석 중..." : "점수 분석 시작"}
              </Button>

              {mutation.isError && (
                <p className="text-sm text-rose-500 font-semibold">{mutation.error.message}</p>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">⌘ + Enter</p>

            <UsageBar used={used} limit={limit} />
          </div>
        </div>
      </section>

      {/* Right Result */}
      <section className="col-span-1 lg:col-span-7 space-y-6">
        {/* Main Score UI */}
        <div className="bg-card rounded-2xl p-8 shadow-sm border border-muted/50 text-center relative overflow-hidden">
          <h3 className="text-xs font-black text-muted-foreground mb-8 uppercase tracking-widest">
            AI 진단 결과
          </h3>

          <div className="relative inline-flex items-center justify-center mb-8">
            <svg className="w-48 h-48 transform -rotate-90 scale-110">
              <circle className="text-muted/30" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" strokeWidth="12" />
              <circle
                className={`${svgColor} transition-all duration-700`}
                cx="96"
                cy="96"
                fill="transparent"
                r="88"
                stroke="currentColor"
                strokeDasharray="552.9"
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                strokeWidth="12"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center pb-2">
              {mutation.isPending ? (
                <div className="w-16 h-16 rounded-full bg-muted/50 animate-pulse" />
              ) : (
                <>
                  <span className="text-6xl font-black tabular-nums tracking-tighter">
                    {score ? score.totalScore : "--"}
                  </span>
                  <span className={`text-sm font-black mt-1 uppercase tracking-widest ${score ? gradeColor(score.grade) : "text-muted-foreground"}`}>
                    {score ? score.grade : "?"}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <ScoreMetricCard
              label="키워드 활용"
              value={score?.subMetrics.keywordUsage}
              loading={mutation.isPending}
            />
            <ScoreMetricCard
              label="가독성"
              value={score?.subMetrics.readability}
              loading={mutation.isPending}
            />
            <ScoreMetricCard
              label="구조화(소제목)"
              value={score?.subMetrics.structure}
              loading={mutation.isPending}
            />
            <ScoreMetricCard
              label="깊이/전문성"
              value={score?.subMetrics.depth}
              loading={mutation.isPending}
            />
          </div>
        </div>

        {/* Suggestion Card */}
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-muted/50">
          <h4 className="text-sm font-black text-foreground mb-4 flex items-center gap-2">
            <Target className="size-4 text-primary" /> 개선 액션 플랜
          </h4>

          {mutation.isPending && (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted/40 rounded-xl" />
              ))}
            </div>
          )}

          {!mutation.isPending && !score && (
            <p className="text-sm text-muted-foreground text-center py-4">분석 후 결과가 표시됩니다.</p>
          )}

          {score && (
            <ul className="space-y-3">
              {score.strengths.map((s, i) => (
                <li key={`s-${i}`} className="flex items-start gap-3 p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                  <CheckCircle2 className="size-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-400">{s}</p>
                </li>
              ))}
              {score.improvements.map((imp, i) => (
                <li key={`i-${i}`} className="flex items-start gap-3 p-3 bg-rose-50/50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900/30">
                  <AlertCircle className="size-5 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-rose-900 dark:text-rose-400">{imp}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {onGoToDraft && score && (
          <div className="p-6 bg-foreground text-background rounded-2xl flex items-center justify-between gap-6 overflow-hidden relative shadow-xl">
            <div className="relative z-10">
              <h4 className="font-extrabold text-lg">분석 결과를 반영하고 싶으신가요?</h4>
              <p className="text-sm text-background/70 mt-1">AI 초안 작성으로 개선점을 바로 적용해보세요.</p>
            </div>
            <Button
              variant="outline"
              className="relative z-10 shrink-0 bg-background text-foreground border-none font-bold rounded-xl hover:bg-background/90"
              onClick={() => onGoToDraft(keyword)}
            >
              초안 작성하기 <ArrowRight className="size-4 ml-2" />
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── ScoreMetricCard ──────────────────────────────────────────────────────────

function ScoreMetricCard({
  label,
  value,
  loading,
}: {
  label: string;
  value?: number;
  loading: boolean;
}) {
  const displayValue = value !== undefined ? `${value}` : "--";
  const color =
    value === undefined
      ? ""
      : value >= 80
      ? "text-emerald-500"
      : value >= 60
      ? "text-blue-500"
      : value >= 40
      ? "text-amber-500"
      : "text-rose-500";

  return (
    <div className="bg-muted/30 p-4 rounded-xl text-center">
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">{label}</p>
      {loading ? (
        <div className="h-6 bg-muted/50 rounded w-1/2 mx-auto animate-pulse" />
      ) : (
        <p className={`text-lg font-black ${color}`}>{displayValue}</p>
      )}
    </div>
  );
}
