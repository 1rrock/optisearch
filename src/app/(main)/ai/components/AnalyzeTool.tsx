"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Copy,
  RefreshCcw,
  ArrowRight,
  CheckCircle2,
  BarChart2,
  Lightbulb,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { copyToClipboard } from "@/shared/lib/clipboard";
import { UsageLimitError, parseUsageLimitError } from "@/shared/lib/errors";
import { UsageBar, PlanLockOverlay, type UpgradeModalState } from "./shared";
import { toast } from "sonner";
import type { AICompetitiveAnalysis } from "@/entities/analysis/model/types";

type AnalysisContext = Pick<AICompetitiveAnalysis, "uncoveredTopics" | "recommendedTitles" | "strategySummary">;

// ─── API response types ────────────────────────────────────────────────────────

type AnalysisResult = AICompetitiveAnalysis;

interface AnalyzeResponse {
  analysis: AnalysisResult;
}

// ─── AnalyzeTool ───────────────────────────────────────────────────────────────

export function AnalyzeTool({
  onGoToDraft,
  onUsageLimitExceeded,
  used,
  limit,
  onMutationSuccess,
  initialKeyword,
}: {
  onGoToDraft: (title?: string, analysisContext?: AnalysisContext) => void;
  onUsageLimitExceeded: (state: UpgradeModalState) => void;
  used: number;
  limit: number;
  onMutationSuccess: () => void;
  initialKeyword?: string;
}) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(initialKeyword ?? "");

  const mutation = useMutation<AnalyzeResponse, Error, { keyword: string }>({
    mutationFn: async (payload) => {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const limitErr = parseUsageLimitError(res.status, data);
        if (limitErr) throw limitErr;
        throw new Error(data.error ?? "경쟁 분석 요청에 실패했습니다.");
      }
      return res.json() as Promise<AnalyzeResponse>;
    },
    onError: (err) => {
      if (err instanceof UsageLimitError) {
        onUsageLimitExceeded({ feature: "AI 경쟁 분석", used: err.used, limit: err.limit });
      }
    },
    onSuccess: () => {
      onMutationSuccess();
      toast.success("경쟁 분석이 완료되었습니다");
    },
  });

  const handleAnalyze = () => {
    if (!keyword.trim()) return;
    mutation.mutate({ keyword: keyword.trim() });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!mutation.isPending) handleAnalyze();
    }
  };

  const analysis = mutation.data?.analysis;

  return (
    <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in slide-in-from-bottom-4 duration-500">
      {limit === 0 && (
        <PlanLockOverlay featureName="AI 경쟁 분석" onUpgrade={() => router.push("/pricing")} />
      )}
      {/* Input Form */}
      <section className="col-span-1 lg:col-span-5 bg-card p-8 rounded-2xl shadow-sm border border-muted/50">
        <div className="mb-8">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart2 className="size-5 text-primary" />
            경쟁 분석
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            키워드의 상위 인기글을 분석하여 아직 다루지 않은 공백을 발견하고, 차별화된 제목을 추천받으세요.
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-bold flex items-center justify-between">
              분석할 키워드
              <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-md uppercase">필수</span>
            </label>
            <input
              className="w-full bg-muted/20 border-transparent focus:border-primary/30 focus:ring-4 focus:ring-primary/10 rounded-xl py-3 px-4 text-sm transition-all"
              placeholder="예: 강남 맛집"
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="pt-4">
            <Button
              size="lg"
              className="w-full rounded-xl font-bold bg-primary hover:scale-[1.02] shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
              onClick={handleAnalyze}
              disabled={mutation.isPending || !keyword.trim()}
            >
              <Sparkles className="size-5" />
              {mutation.isPending ? "분석 중..." : "경쟁 분석 시작"}
            </Button>

            <p className="text-[10px] text-muted-foreground text-center mt-2">⌘ + Enter</p>

            {mutation.isError && !(mutation.error instanceof UsageLimitError) && (
              <p className="mt-3 text-sm text-rose-500 font-semibold">{mutation.error.message}</p>
            )}

            <UsageBar used={used} limit={limit} />
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="col-span-1 lg:col-span-7 space-y-4">
        <div className="flex items-center justify-between px-2 mb-2">
          <h3 className="text-lg font-bold">
            {mutation.isSuccess ? `"${keyword}" 경쟁 분석 결과` : "분석 결과"}
          </h3>
          {mutation.isSuccess && (
            <Button
              variant="ghost"
              size="sm"
              className="font-bold text-muted-foreground"
              onClick={handleAnalyze}
              disabled={mutation.isPending}
            >
              <RefreshCcw className="size-4 mr-2" /> 새로고침
            </Button>
          )}
        </div>

        {mutation.isPending && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card p-6 rounded-2xl border border-muted/50 animate-pulse">
                <div className="h-4 bg-muted/50 rounded w-1/3 mb-4" />
                <div className="space-y-2">
                  <div className="h-3 bg-muted/50 rounded w-3/4" />
                  <div className="h-3 bg-muted/50 rounded w-2/3" />
                  <div className="h-3 bg-muted/50 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {analysis && (
          <div className="space-y-4">
            {/* Covered Topics */}
            <div className="bg-card p-6 rounded-2xl border border-muted/50">
              <h4 className="text-sm font-bold flex items-center gap-2 mb-4 text-muted-foreground uppercase tracking-wider">
                <XCircle className="size-4 text-rose-400" />
                상위글이 이미 다루는 주제
              </h4>
              {analysis.coveredTopics.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {analysis.coveredTopics.map((topic, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-muted/40 rounded-lg text-sm font-medium text-muted-foreground"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">분석 데이터가 충분하지 않습니다.</p>
              )}
            </div>

            {/* Uncovered Topics */}
            <div className="bg-card p-6 rounded-2xl border border-primary/20 shadow-sm">
              <h4 className="text-sm font-bold flex items-center gap-2 mb-4 text-primary uppercase tracking-wider">
                <Lightbulb className="size-4 text-amber-400" />
                아직 없는 각도 (공백)
              </h4>
              {analysis.uncoveredTopics.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {analysis.uncoveredTopics.map((topic, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-primary/10 rounded-lg text-sm font-bold text-primary"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">공백 각도를 찾지 못했습니다.</p>
              )}
            </div>

            {/* Recommended Titles */}
            <div className="bg-card p-6 rounded-2xl border border-muted/50">
              <h4 className="text-sm font-bold flex items-center gap-2 mb-4 text-muted-foreground uppercase tracking-wider">
                <Sparkles className="size-4 text-violet-400" />
                추천 제목 (공백 기반)
              </h4>
              <div className="space-y-3">
                {analysis.recommendedTitles.map((title, i) => (
                  <TitleResultRow
                    key={i}
                    rank={i + 1}
                    title={title}
                    onUseTitleForDraft={(t) => onGoToDraft(t, {
                      uncoveredTopics: analysis.uncoveredTopics,
                      recommendedTitles: analysis.recommendedTitles,
                      strategySummary: analysis.strategySummary,
                    })}
                  />
                ))}
              </div>
            </div>

            {/* Strategy + Difficulty */}
            <div className="bg-card p-6 rounded-2xl border border-muted/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="text-sm font-bold flex items-center gap-2 mb-2 text-muted-foreground uppercase tracking-wider">
                    <ChevronRight className="size-4" />
                    전략 요약
                  </h4>
                  <p className="text-sm font-medium text-foreground leading-relaxed">
                    {analysis.strategySummary}
                  </p>
                </div>
                <div className="shrink-0">
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide ${
                    analysis.difficulty === "쉬움"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : analysis.difficulty === "보통"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                  }`}>
                    난이도: {analysis.difficulty}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {!mutation.isPending && !mutation.isSuccess && (
          <div className="py-16 text-center">
            <BarChart2 className="size-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm font-bold text-muted-foreground mb-1">아직 분석된 결과가 없습니다</p>
            <p className="text-xs text-muted-foreground/70">키워드를 입력하고 경쟁 분석 시작 버튼을 눌러주세요.</p>
          </div>
        )}

        {/* CTA to Draft Tool */}
        <div className="mt-8 p-6 bg-foreground text-background rounded-2xl flex items-center justify-between gap-6 overflow-hidden relative shadow-xl">
          <div className="relative z-10">
            <h4 className="font-extrabold text-lg">공략할 각도를 찾으셨나요?</h4>
            <p className="text-sm text-background/70 mt-1">추천 제목으로 바로 AI 초안 작성을 시작해 5분 만에 포스팅을 완성하세요.</p>
          </div>
          <Button
            variant="outline"
            className="relative z-10 shrink-0 bg-background text-foreground border-none font-bold rounded-xl hover:bg-background/90"
            onClick={() => onGoToDraft(undefined, analysis ? {
              uncoveredTopics: analysis.uncoveredTopics,
              recommendedTitles: analysis.recommendedTitles,
              strategySummary: analysis.strategySummary,
            } : undefined)}
          >
            초안 작성하기 <ArrowRight className="size-4 ml-2" />
          </Button>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-48 h-48 bg-primary/30 rounded-full blur-3xl pointer-events-none"></div>
        </div>
      </section>
    </div>
  );
}

// ─── TitleResultRow ───────────────────────────────────────────────────────────

function TitleResultRow({
  rank,
  title,
  onUseTitleForDraft,
}: {
  rank: number;
  title: string;
  onUseTitleForDraft: (title: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(title);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="group flex items-center gap-3 p-4 bg-muted/20 hover:bg-muted/40 rounded-xl transition-all">
      <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center">
        {rank}
      </span>
      <span className="flex-1 text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
        {title}
      </span>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-lg hover:bg-primary/10 text-primary"
          onClick={handleCopy}
          title="복사"
          aria-label="복사"
        >
          {copied ? <CheckCircle2 className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-lg hover:bg-primary/10 text-primary"
          onClick={() => onUseTitleForDraft(title)}
          title="이 제목으로 초안 작성"
          aria-label="이 제목으로 초안 작성"
        >
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
