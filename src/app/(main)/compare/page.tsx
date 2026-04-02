"use client";

import { useState, useRef } from "react";
import { Plus, X, Bot, ArrowRightLeft } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { PageHeader } from "@/shared/ui/page-header";
import type { KeywordSearchResult } from "@/entities/keyword/model/types";
import { getKeywordGradeConfig } from "@/shared/config/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnalyzeResponse {
  analysis: KeywordSearchResult;
  relatedKeywords: unknown[];
  correctedKeyword: string | null;
}

interface KeywordEntry {
  keyword: string;
  data: KeywordSearchResult | null;
  loading: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_KEYWORDS = 5;

const CHART_COLORS = [
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function competitionBadgeClass(competition: string): string {
  if (competition === "낮음") return "bg-emerald-100 text-emerald-700";
  if (competition === "중간") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

function formatNumber(n: number): string {
  return n.toLocaleString("ko-KR");
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BadgeChip({
  label,
  color,
  onRemove,
}: {
  label: string;
  color?: string;
  onRemove?: () => void;
}) {
  return (
    <Card className="flex items-center gap-2 px-4 py-2 shadow-sm border-muted/50 rounded-full">
      {color && (
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="text-sm font-medium">{label}</span>
      {onRemove && (
        <X
          className="size-4 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
          onClick={onRemove}
        />
      )}
    </Card>
  );
}

function SkeletonCell() {
  return (
    <td className="p-6">
      <div className="h-5 w-20 bg-muted animate-pulse rounded" />
    </td>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ComparePage() {
  const [entries, setEntries] = useState<KeywordEntry[]>([]);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const analyzeMutation = useMutation<AnalyzeResponse, Error, string>({
    mutationFn: async (keyword: string) => {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "분석 실패");
      }
      return res.json() as Promise<AnalyzeResponse>;
    },
    onMutate: (keyword) => {
      // Mark the entry as loading
      setEntries((prev) =>
        prev.map((e) =>
          e.keyword === keyword ? { ...e, loading: true, error: null } : e
        )
      );
    },
    onSuccess: (data, keyword) => {
      setEntries((prev) =>
        prev.map((e) =>
          e.keyword === keyword
            ? { ...e, data: data.analysis, loading: false, error: null }
            : e
        )
      );
    },
    onError: (error, keyword) => {
      setEntries((prev) =>
        prev.map((e) =>
          e.keyword === keyword
            ? { ...e, loading: false, error: error.message }
            : e
        )
      );
    },
  });

  function addKeyword() {
    const kw = inputValue.trim();
    if (!kw) return;
    if (entries.length >= MAX_KEYWORDS) return;
    if (entries.some((e) => e.keyword === kw)) {
      setInputValue("");
      return;
    }

    const newEntry: KeywordEntry = {
      keyword: kw,
      data: null,
      loading: true,
      error: null,
    };
    setEntries((prev) => [...prev, newEntry]);
    setInputValue("");
    analyzeMutation.mutate(kw);
    inputRef.current?.focus();
  }

  function removeKeyword(kw: string) {
    setEntries((prev) => prev.filter((e) => e.keyword !== kw));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") addKeyword();
  }

  // Compute best indices for highlight
  const loadedEntries = entries.map((e) => e.data);

  const bestTotalVolume = (() => {
    let best = -1;
    let bestIdx = -1;
    loadedEntries.forEach((d, i) => {
      if (d && d.totalSearchVolume > best) {
        best = d.totalSearchVolume;
        bestIdx = i;
      }
    });
    return bestIdx;
  })();

  const bestPcVolume = (() => {
    let best = -1;
    let bestIdx = -1;
    loadedEntries.forEach((d, i) => {
      if (d && d.pcSearchVolume > best) {
        best = d.pcSearchVolume;
        bestIdx = i;
      }
    });
    return bestIdx;
  })();

  const bestMobileVolume = (() => {
    let best = -1;
    let bestIdx = -1;
    loadedEntries.forEach((d, i) => {
      if (d && d.mobileSearchVolume > best) {
        best = d.mobileSearchVolume;
        bestIdx = i;
      }
    });
    return bestIdx;
  })();

  const lowestCompetition = (() => {
    // 낮음 < 중간 < 높음, prefer 낮음
    const order = ["낮음", "중간", "높음"];
    let bestRank = Infinity;
    let bestIdx = -1;
    loadedEntries.forEach((d, i) => {
      if (d) {
        const rank = order.indexOf(d.competition);
        if (rank < bestRank) {
          bestRank = rank;
          bestIdx = i;
        }
      }
    });
    return bestIdx;
  })();

  const bestGrade = (() => {
    // Grade order: S+ is best (index 0 in KEYWORD_GRADES)
    const gradeOrder = [
      "S+", "S", "S-",
      "A+", "A", "A-",
      "B+", "B", "B-",
      "C+", "C", "C-",
      "D+", "D", "D-",
    ];
    let bestRank = Infinity;
    let bestIdx = -1;
    loadedEntries.forEach((d, i) => {
      if (d) {
        const rank = gradeOrder.indexOf(d.keywordGrade);
        if (rank !== -1 && rank < bestRank) {
          bestRank = rank;
          bestIdx = i;
        }
      }
    });
    return bestIdx;
  })();

  const bestClicks = (() => {
    let best = -1;
    let bestIdx = -1;
    loadedEntries.forEach((d, i) => {
      if (d) {
        const clicks = Math.round(d.totalSearchVolume * d.clickRate);
        if (clicks > best) {
          best = clicks;
          bestIdx = i;
        }
      }
    });
    return bestIdx;
  })();

  const lowestBlogPosts = (() => {
    let best = Infinity;
    let bestIdx = -1;
    loadedEntries.forEach((d, i) => {
      if (d && d.blogPostCount < best) {
        best = d.blogPostCount;
        bestIdx = i;
      }
    });
    return bestIdx;
  })();

  const hasAnyData = entries.length > 0;

  return (
    <div className="space-y-8">

      {/* Header Section */}
      <PageHeader
        icon={<ArrowRightLeft className="size-8 text-primary" />}
        title="키워드 비교"
        description={`최대 ${MAX_KEYWORDS}개의 키워드를 한눈에 비교하고 수익성 높은 키워드를 선별하세요.`}
        rightContent={
          <div className="flex flex-col gap-3 md:items-end">
            {/* Keyword chips */}
            {entries.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                {entries.map((entry, i) => (
                  <BadgeChip
                    key={entry.keyword}
                    label={entry.keyword}
                    color={CHART_COLORS[i % CHART_COLORS.length]}
                    onRemove={() => removeKeyword(entry.keyword)}
                  />
                ))}
              </div>
            )}

            {/* Input row */}
            {entries.length < MAX_KEYWORDS && (
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="키워드 입력..."
                  className="h-9 rounded-full border border-muted/60 bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button
                  variant="ghost"
                  onClick={addKeyword}
                  disabled={!inputValue.trim()}
                  className="flex items-center gap-1 px-4 py-2 text-primary hover:bg-primary/5 rounded-full transition-colors text-sm font-semibold border border-transparent"
                >
                  <Plus className="size-4" /> 추가
                </Button>
              </div>
            )}
          </div>
        }
      />

      {/* Empty state */}
      {!hasAnyData && (
        <Card className="rounded-xl shadow-sm border-muted/50 p-16 flex flex-col items-center gap-4 text-center">
          <ArrowRightLeft className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground font-medium">
            비교할 키워드를 추가하세요 (최대 {MAX_KEYWORDS}개)
          </p>
          <p className="text-sm text-muted-foreground/60">
            위 입력창에서 키워드를 입력하고 추가 버튼을 누르세요.
          </p>
        </Card>
      )}

      {/* Comparison Table Card */}
      {hasAnyData && (
        <Card className="rounded-xl shadow-sm overflow-hidden border-muted/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30">
                  <th className="p-6 text-sm font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    항목 (Metric)
                  </th>
                  {entries.map((entry, i) => (
                    <th key={entry.keyword} className="p-6 text-base font-bold whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                        {entry.keyword}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/30">

                {/* 월간 검색량 */}
                <tr>
                  <td className="p-6 text-sm font-medium text-muted-foreground">월간 검색량</td>
                  {entries.map((entry, i) => {
                    if (entry.loading) return <SkeletonCell key={entry.keyword} />;
                    if (!entry.data) return <td key={entry.keyword} className="p-6 text-muted-foreground/40">—</td>;
                    const isBest = i === bestTotalVolume;
                    return (
                      <td key={entry.keyword} className="p-6">
                        {isBest ? (
                          <span className="px-3 py-1 bg-primary/10 text-primary font-bold rounded-lg inline-block">
                            {formatNumber(entry.data.totalSearchVolume)}
                          </span>
                        ) : (
                          <span className="font-semibold">{formatNumber(entry.data.totalSearchVolume)}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* PC 검색량 */}
                <tr>
                  <td className="p-6 text-sm font-medium text-muted-foreground">PC 검색량</td>
                  {entries.map((entry, i) => {
                    if (entry.loading) return <SkeletonCell key={entry.keyword} />;
                    if (!entry.data) return <td key={entry.keyword} className="p-6 text-muted-foreground/40">—</td>;
                    const isBest = i === bestPcVolume;
                    return (
                      <td key={entry.keyword} className={`p-6 ${isBest ? "font-semibold" : "text-foreground/80 font-medium"}`}>
                        {formatNumber(entry.data.pcSearchVolume)}
                      </td>
                    );
                  })}
                </tr>

                {/* 모바일 검색량 */}
                <tr>
                  <td className="p-6 text-sm font-medium text-muted-foreground">모바일 검색량</td>
                  {entries.map((entry, i) => {
                    if (entry.loading) return <SkeletonCell key={entry.keyword} />;
                    if (!entry.data) return <td key={entry.keyword} className="p-6 text-muted-foreground/40">—</td>;
                    const isBest = i === bestMobileVolume;
                    return (
                      <td key={entry.keyword} className={`p-6 ${isBest ? "font-semibold" : "text-foreground/80 font-medium"}`}>
                        {formatNumber(entry.data.mobileSearchVolume)}
                      </td>
                    );
                  })}
                </tr>

                {/* 경쟁도 */}
                <tr>
                  <td className="p-6 text-sm font-medium text-muted-foreground">경쟁도</td>
                  {entries.map((entry, i) => {
                    if (entry.loading) return <SkeletonCell key={entry.keyword} />;
                    if (!entry.data) return <td key={entry.keyword} className="p-6 text-muted-foreground/40">—</td>;
                    const isBest = i === lowestCompetition;
                    return (
                      <td key={entry.keyword} className={`p-6 ${isBest ? "bg-emerald-50/50" : ""}`}>
                        <Badge className={competitionBadgeClass(entry.data.competition)}>
                          {entry.data.competition}
                        </Badge>
                      </td>
                    );
                  })}
                </tr>

                {/* 월간 클릭수 */}
                <tr>
                  <td className="p-6 text-sm font-medium text-muted-foreground">월간 클릭수</td>
                  {entries.map((entry, i) => {
                    if (entry.loading) return <SkeletonCell key={entry.keyword} />;
                    if (!entry.data) return <td key={entry.keyword} className="p-6 text-muted-foreground/40">—</td>;
                    const clicks = Math.round(entry.data.totalSearchVolume * entry.data.clickRate);
                    const isBest = i === bestClicks;
                    return (
                      <td key={entry.keyword} className="p-6">
                        {isBest ? (
                          <span className="px-3 py-1 bg-primary/5 text-primary font-bold rounded-lg inline-block">
                            {formatNumber(clicks)}
                          </span>
                        ) : (
                          <span className="text-foreground/80 font-medium">{formatNumber(clicks)}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* 블로그 글 수 */}
                <tr>
                  <td className="p-6 text-sm font-medium text-muted-foreground">블로그 글 수</td>
                  {entries.map((entry, i) => {
                    if (entry.loading) return <SkeletonCell key={entry.keyword} />;
                    if (!entry.data) return <td key={entry.keyword} className="p-6 text-muted-foreground/40">—</td>;
                    const isBest = i === lowestBlogPosts;
                    return (
                      <td key={entry.keyword} className={`p-6 ${isBest ? "font-semibold" : "text-foreground/80 font-medium"}`}>
                        {formatNumber(entry.data.blogPostCount)}
                      </td>
                    );
                  })}
                </tr>

                {/* 키워드 등급 */}
                <tr>
                  <td className="p-6 text-sm font-medium text-muted-foreground">키워드 등급</td>
                  {entries.map((entry, i) => {
                    if (entry.loading) return <SkeletonCell key={entry.keyword} />;
                    if (!entry.data) return <td key={entry.keyword} className="p-6 text-muted-foreground/40">—</td>;
                    const gradeConfig = getKeywordGradeConfig(entry.data.keywordGrade);
                    const isBest = i === bestGrade;
                    return (
                      <td key={entry.keyword} className={`p-6 ${isBest ? "bg-primary/5" : ""}`}>
                        <div className="flex flex-col gap-1">
                          <span
                            className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-white text-sm font-extrabold"
                            style={{ backgroundColor: gradeConfig.color }}
                          >
                            {gradeConfig.grade}
                          </span>
                          <span className={`text-xs font-bold ${isBest ? "text-primary" : "text-muted-foreground"}`}>
                            {gradeConfig.minScore}~{gradeConfig.maxScore}점
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>

              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Trends Chart Card */}
      {hasAnyData && (
        <Card className="rounded-xl p-8 shadow-sm border-muted/50">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-lg font-bold">검색량 트렌드 비교</h2>
            <div className="flex flex-wrap items-center gap-6">
              {entries.map((entry, i) => (
                <div key={entry.keyword} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <span className="text-xs font-medium text-muted-foreground">{entry.keyword}</span>
                </div>
              ))}
            </div>
          </div>

          {/* TODO: W4 DataLab connection — replace placeholder with real trend data */}
          <div className="relative h-64 w-full pl-8">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pl-8">
              <div className="w-full h-[1px] bg-muted relative">
                <span className="absolute -left-10 -top-2 text-[10px] text-muted-foreground">60k</span>
              </div>
              <div className="w-full h-[1px] bg-muted relative">
                <span className="absolute -left-10 -top-2 text-[10px] text-muted-foreground">45k</span>
              </div>
              <div className="w-full h-[1px] bg-muted relative">
                <span className="absolute -left-10 -top-2 text-[10px] text-muted-foreground">30k</span>
              </div>
              <div className="w-full h-[1px] bg-muted relative">
                <span className="absolute -left-10 -top-2 text-[10px] text-muted-foreground">15k</span>
              </div>
              <div className="w-full h-[1px] bg-muted relative">
                <span className="absolute -left-10 -top-2 text-[10px] text-muted-foreground">0</span>
              </div>
            </div>

            <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 256" preserveAspectRatio="none">
              {entries.map((entry, i) => {
                // Placeholder SVG paths per slot — real data via W4 DataLab
                const placeholderPaths = [
                  "M0,150 Q80,140 160,180 T320,130 T480,160 T640,110 T800,140 T960,90",
                  "M0,180 Q80,190 160,170 T320,160 T480,180 T640,150 T800,165 T960,140",
                  "M0,130 Q80,120 160,110 T320,140 T480,90 T640,105 T800,75 T960,40",
                  "M0,160 Q80,155 160,145 T320,150 T480,120 T640,135 T800,110 T960,80",
                  "M0,140 Q80,150 160,130 T320,120 T480,145 T640,90 T800,100 T960,60",
                ];
                return (
                  <path
                    key={entry.keyword}
                    d={placeholderPaths[i % placeholderPaths.length]}
                    fill="none"
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeLinecap="round"
                    strokeWidth="3"
                  />
                );
              })}
            </svg>

            <div className="flex justify-between mt-4 px-2">
              {["1월", "3월", "5월", "7월", "9월", "11월", "12월"].map((m) => (
                <span key={m} className="text-[11px] text-muted-foreground font-medium">{m}</span>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Final CTA */}
      <div className="pt-8 pb-12 flex justify-center">
        <Button
          size="lg"
          disabled
          className="px-12 py-5 text-lg font-bold rounded-2xl shadow-xl shadow-primary/20 flex items-center gap-3 opacity-60 cursor-not-allowed"
        >
          <Bot className="size-6" /> 준비 중
        </Button>
      </div>

    </div>
  );
}
