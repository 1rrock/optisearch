"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, X, ArrowRightLeft, Search, AlertCircle, BarChart2, Bookmark } from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { getKeywordGradeConfig, CHART_COLORS } from "@/shared/config/constants";
import type { KeywordSearchResult } from "@/entities/keyword/model/types";
import { formatNumber, competitionBadgeClass } from "@/shared/lib/keyword-utils";
import { getApiErrorMessage } from "@/shared/lib/errors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KeywordApiResponse {
  keyword: string;
  pcSearchVolume: number;
  mobileSearchVolume: number;
  totalSearchVolume: number;
  competition: string;
  clickRate: number;
  blogPostCount: number;
  saturationIndex: {
    value: number;
    label: string;
    score: number;
  };
  keywordGrade: string;
  correctedKeyword?: string | null;
}

interface KeywordResult {
  keyword: string;
  data: KeywordSearchResult | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_KEYWORDS = 5;
const MIN_KEYWORDS = 2;

const SATURATION_COLORS: Record<string, string> = {
  "매우 낮음": "#16A34A",
  "낮음": "#22C55E",
  "보통": "#EAB308",
  "높음": "#EA580C",
  "매우 높음": "#EF4444",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchKeyword(keyword: string): Promise<KeywordSearchResult> {
  const res = await fetch("/api/keywords", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(getApiErrorMessage(data) ?? `분석 실패 (${res.status})`);
  }
  const json = (await res.json()) as KeywordApiResponse;
  return {
    keyword: json.keyword,
    pcSearchVolume: json.pcSearchVolume,
    mobileSearchVolume: json.mobileSearchVolume,
    totalSearchVolume: json.totalSearchVolume,
    competition: json.competition as KeywordSearchResult["competition"],
    clickRate: json.clickRate,
    blogPostCount: json.blogPostCount,
    saturationIndex: json.saturationIndex as KeywordSearchResult["saturationIndex"],
    keywordGrade: json.keywordGrade as KeywordSearchResult["keywordGrade"],
    sectionData: null,
    topPosts: null,
    shoppingData: null,
    createdAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="size-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
        <BarChart2 className="size-10 text-muted-foreground/50" />
      </div>
      <h3 className="text-xl font-bold text-foreground/80 mb-2">키워드를 입력하고 비교를 시작하세요</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        최소 2개, 최대 {MAX_KEYWORDS}개의 키워드를 입력하고 <strong>비교하기</strong> 버튼을 누르세요.
      </p>
    </div>
  );
}

function VolumeBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 4;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-4 bg-muted/40 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-semibold text-muted-foreground w-16 text-right tabular-nums">
        {formatNumber(value)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function KeywordComparePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24 text-muted-foreground">로딩 중...</div>}>
      <KeywordComparePageInner />
    </Suspense>
  );
}

function KeywordComparePageInner() {
  const searchParams = useSearchParams();
  const [inputs, setInputs] = useState<string[]>(["", ""]);
  const [results, setResults] = useState<KeywordResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [savedKeywords, setSavedKeywords] = useState<Array<{ keyword: string }>>([]);
  const [activePopover, setActivePopover] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/keywords/saved")
      .then(res => res.ok ? res.json() : { keywords: [] })
      .then(data => setSavedKeywords(data.keywords ?? []))
      .catch(() => {});
  }, []);

  async function runComparison(keywords: string[]) {
    if (keywords.length < MIN_KEYWORDS) return;

    setIsLoading(true);
    setGlobalError(null);
    setResults(null);

    const settled = await Promise.allSettled(keywords.map(fetchKeyword));

    const mapped: KeywordResult[] = settled.map((res, i) => {
      if (res.status === "fulfilled") {
        return { keyword: keywords[i], data: res.value, error: null };
      }
      return {
        keyword: keywords[i],
        data: null,
        error: res.reason instanceof Error ? res.reason.message : "분석 실패",
      };
    });

    setResults(mapped);
    setIsLoading(false);
  }

  useEffect(() => {
    const param = searchParams.get("keywords");
    if (!param) return;
    const keywords = param
      .split(",")
      .map((k) => decodeURIComponent(k.trim()))
      .filter(Boolean);
    if (keywords.length < 1) return;
    setInputs(keywords.length >= MIN_KEYWORDS ? keywords : [...keywords, ...Array(MIN_KEYWORDS - keywords.length).fill("")]);
    runComparison(keywords);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addInput() {
    if (inputs.length < MAX_KEYWORDS) {
      setInputs((prev) => [...prev, ""]);
    }
  }

  function removeInput(index: number) {
    if (inputs.length <= MIN_KEYWORDS) return;
    setInputs((prev) => prev.filter((_, i) => i !== index));
  }

  function updateInput(index: number, value: string) {
    setInputs((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const keywords = inputs.map((k) => k.trim()).filter(Boolean);
    await runComparison(keywords);
  }

  const loadedResults = results?.filter((r) => r.data !== null) ?? [];
  const hasResults = loadedResults.length > 0;

  // Compute max total volume for bar chart scale
  const maxTotalVolume = loadedResults.reduce(
    (max, r) => Math.max(max, r.data?.totalSearchVolume ?? 0),
    0
  );
  const maxPcVolume = loadedResults.reduce(
    (max, r) => Math.max(max, r.data?.pcSearchVolume ?? 0),
    0
  );
  const maxMobileVolume = loadedResults.reduce(
    (max, r) => Math.max(max, r.data?.mobileSearchVolume ?? 0),
    0
  );

  // Best index calculations
  const bestTotalIdx = loadedResults.reduce(
    (bestIdx, r, i) =>
      (r.data?.totalSearchVolume ?? 0) > (loadedResults[bestIdx]?.data?.totalSearchVolume ?? 0)
        ? i
        : bestIdx,
    0
  );

  const gradeOrder = [
    "S+", "S", "S-",
    "A+", "A", "A-",
    "B+", "B", "B-",
    "C+", "C", "C-",
    "D+", "D", "D-",
  ];
  const bestGradeIdx = loadedResults.reduce((bestIdx, r, i) => {
    const rank = gradeOrder.indexOf(r.data?.keywordGrade ?? "D-");
    const bestRank = gradeOrder.indexOf(loadedResults[bestIdx]?.data?.keywordGrade ?? "D-");
    return rank < bestRank ? i : bestIdx;
  }, 0);

  const compOrder = ["낮음", "중간", "높음"];
  const lowestCompIdx = loadedResults.reduce((bestIdx, r, i) => {
    const rank = compOrder.indexOf(r.data?.competition ?? "높음");
    const bestRank = compOrder.indexOf(loadedResults[bestIdx]?.data?.competition ?? "높음");
    return rank < bestRank ? i : bestIdx;
  }, 0);

  return (
    <div className="space-y-10">
      <PageHeader
        icon={<ArrowRightLeft className="size-8 text-primary" />}
        title="키워드 비교"
        description={`최대 ${MAX_KEYWORDS}개 키워드를 동시에 비교하여 최적의 키워드를 선택하세요.`}
      />

      {/* Input Form */}
      <section>
        {activePopover !== null && (
          <div className="fixed inset-0 z-40" onClick={() => setActivePopover(null)} />
        )}
        <form onSubmit={handleSubmit}>
          <div className="bg-card rounded-2xl shadow-sm border border-muted/50 p-6 md:p-8 space-y-6">
            <p className="text-sm font-semibold text-muted-foreground">
              비교할 키워드를 입력하세요 ({inputs.length}/{MAX_KEYWORDS})
            </p>

            {/* Keyword inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {inputs.map((val, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                    </div>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => updateInput(index, e.target.value)}
                      placeholder={`키워드 ${index + 1}`}
                      className="w-full pl-9 pr-4 py-3 bg-background border border-muted/60 rounded-xl text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActivePopover(activePopover === index ? null : index)}
                      className="size-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
                      title="저장된 키워드에서 선택"
                    >
                      <Bookmark className="size-4" />
                    </button>
                    {activePopover === index && savedKeywords.length > 0 && (
                      <div className="absolute top-full right-0 mt-1 w-56 max-h-60 overflow-y-auto bg-card border border-muted/50 rounded-xl shadow-lg z-50">
                        <div className="p-2">
                          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1.5">저장된 키워드</p>
                          {savedKeywords.map(sk => (
                            <button
                              key={sk.keyword}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-muted/50 transition-colors truncate"
                              onClick={() => {
                                updateInput(index, sk.keyword);
                                setActivePopover(null);
                              }}
                            >
                              {sk.keyword}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {inputs.length > MIN_KEYWORDS && (
                    <button
                      type="button"
                      onClick={() => removeInput(index)}
                      className="size-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors shrink-0"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              ))}

              {/* Add button */}
              {inputs.length < MAX_KEYWORDS && (
                <button
                  type="button"
                  onClick={addInput}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-muted/50 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors text-sm font-medium"
                >
                  <Plus className="size-4" />
                  키워드 추가
                </button>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isLoading || inputs.every((k) => !k.trim())}
                className="flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
              >
                {isLoading ? (
                  <>
                    <span className="size-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                    분석 중…
                  </>
                ) : (
                  <>
                    <Search className="size-4" />
                    비교하기
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Global error */}
      {globalError && (
        <div className="flex items-center gap-3 px-5 py-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-400">
          <AlertCircle className="size-5 shrink-0" />
          <p className="text-sm font-medium">{globalError}</p>
        </div>
      )}

      {/* Empty state (no results yet, not loading) */}
      {!isLoading && results === null && <EmptyState />}

      {/* Partial errors */}
      {results !== null && results.some((r) => r.error) && (
        <div className="space-y-2">
          {results
            .filter((r) => r.error)
            .map((r) => (
              <div
                key={r.keyword}
                className="flex items-center gap-3 px-5 py-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-400"
              >
                <AlertCircle className="size-4 shrink-0" />
                <p className="text-sm font-medium">
                  <strong>&apos;{r.keyword}&apos;</strong>: {r.error}
                </p>
              </div>
            ))}
        </div>
      )}

      {/* Comparison Table */}
      {hasResults && (
        <section>
          <div className="bg-card rounded-2xl shadow-sm border border-muted/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-muted/30 border-b border-muted/50">
                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap w-32">
                      지표
                    </th>
                    {loadedResults.map((r, i) => (
                      <th key={r.keyword} className="px-6 py-4 text-sm font-bold whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                          />
                          {r.keyword}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted/30">

                  {/* PC 검색량 */}
                  <tr className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-muted-foreground whitespace-nowrap">
                      PC 검색량
                    </td>
                    {loadedResults.map((r) => (
                      <td key={r.keyword} className="px-6 py-4">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatNumber(r.data!.pcSearchVolume)}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* 모바일 검색량 */}
                  <tr className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-muted-foreground whitespace-nowrap">
                      모바일 검색량
                    </td>
                    {loadedResults.map((r) => (
                      <td key={r.keyword} className="px-6 py-4">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatNumber(r.data!.mobileSearchVolume)}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* 총 검색량 */}
                  <tr className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-muted-foreground whitespace-nowrap">
                      총 검색량
                    </td>
                    {loadedResults.map((r, i) => {
                      const isBest = i === bestTotalIdx;
                      return (
                        <td key={r.keyword} className="px-6 py-4">
                          <span
                            className={`text-sm font-bold tabular-nums px-2.5 py-1 rounded-lg ${
                              isBest
                                ? "bg-primary/10 text-primary"
                                : "text-foreground/80"
                            }`}
                          >
                            {formatNumber(r.data!.totalSearchVolume)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* 경쟁도 */}
                  <tr className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-muted-foreground whitespace-nowrap">
                      경쟁도
                    </td>
                    {loadedResults.map((r, i) => {
                      const isBest = i === lowestCompIdx;
                      return (
                        <td key={r.keyword} className="px-6 py-4">
                          <span
                            className={`text-[11px] font-bold px-2.5 py-1 rounded ${competitionBadgeClass(r.data!.competition)} ${isBest ? "ring-1 ring-emerald-400" : ""}`}
                          >
                            {r.data!.competition}
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* 포화지수 */}
                  <tr className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-muted-foreground whitespace-nowrap">
                      포화지수
                    </td>
                    {loadedResults.map((r) => {
                      const sat = r.data!.saturationIndex;
                      const color = SATURATION_COLORS[sat.label] ?? "#6b7280";
                      return (
                        <td key={r.keyword} className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[11px] font-bold px-2.5 py-1 rounded text-white"
                              style={{ backgroundColor: color }}
                            >
                              {sat.label}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* 등급 */}
                  <tr className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-muted-foreground whitespace-nowrap">
                      등급
                    </td>
                    {loadedResults.map((r, i) => {
                      const gradeConfig = getKeywordGradeConfig(r.data!.keywordGrade);
                      const isBest = i === bestGradeIdx;
                      return (
                        <td key={r.keyword} className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-white text-sm font-extrabold shadow-sm"
                              style={{ backgroundColor: gradeConfig.color }}
                            >
                              {gradeConfig.grade}
                            </span>
                            {isBest && (
                              <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                최고
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Search Volume Bar Chart */}
      {hasResults && (
        <section>
          <div className="bg-card rounded-2xl shadow-sm border border-muted/50 p-6 md:p-8">
            <h2 className="text-lg font-bold mb-6">검색량 비교</h2>

            <div className="space-y-8">
              {/* Total volume */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  총 검색량
                </p>
                <div className="space-y-3">
                  {loadedResults.map((r, i) => (
                    <div key={r.keyword} className="flex items-center gap-4">
                      <div className="w-20 text-sm font-semibold text-foreground/80 truncate text-right">
                        {r.keyword}
                      </div>
                      <div className="flex-1">
                        <VolumeBar
                          value={r.data!.totalSearchVolume}
                          max={maxTotalVolume}
                          color={CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* PC volume */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      PC 검색량
                    </p>
                  </div>
                  <div className="space-y-3">
                    {loadedResults.map((r, i) => (
                      <div key={r.keyword} className="flex items-center gap-4">
                        <div className="w-20 text-sm font-semibold text-foreground/80 truncate text-right">
                          {r.keyword}
                        </div>
                        <div className="flex-1">
                          <VolumeBar
                            value={r.data!.pcSearchVolume}
                            max={maxPcVolume}
                            color={CHART_COLORS[i % CHART_COLORS.length]}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mobile volume */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      모바일 검색량
                    </p>
                  </div>
                  <div className="space-y-3">
                    {loadedResults.map((r, i) => (
                      <div key={r.keyword} className="flex items-center gap-4">
                        <div className="w-20 text-sm font-semibold text-foreground/80 truncate text-right">
                          {r.keyword}
                        </div>
                        <div className="flex-1">
                          <VolumeBar
                            value={r.data!.mobileSearchVolume}
                            max={maxMobileVolume}
                            color={CHART_COLORS[i % CHART_COLORS.length]}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
