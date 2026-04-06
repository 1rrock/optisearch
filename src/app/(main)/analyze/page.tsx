"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  TrendingUp,
  ArrowRight,
  ArrowRightLeft,
  Sparkles,
  FileText,
  Gauge,
  AlertCircle,
  Info,
  ExternalLink,
  BookOpen,
  LayoutGrid,
  Copy,
  Check,
  Tag,
  Star,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { getKeywordGradeConfig } from "@/shared/config/constants";
import type { KeywordSearchResult, RelatedKeyword } from "@/entities/keyword/model/types";
import type { TrendPoint } from "@/services/trend-service";
import { copyToClipboard, formatKeywordsAsHashtags, formatKeywordsAsTags } from "@/shared/lib/clipboard";
import { UpgradeModal } from "@/shared/components/UpgradeModal";
import { SearchInputWithHistory } from "@/shared/components/SearchInputWithHistory";
import { competitionBadgeClass } from "@/shared/lib/keyword-utils";

// ---------------------------------------------------------------------------
// API types
// ---------------------------------------------------------------------------

interface AnalyzeResponse {
  analysis: KeywordSearchResult;
  relatedKeywords: RelatedKeyword[];
  correctedKeyword: string | null;
  plan?: "free" | "basic" | "pro";
}

// ---------------------------------------------------------------------------
// Inline fetch function (W4에서 feature hook으로 이전 예정)
// ---------------------------------------------------------------------------

import { UsageLimitError, parseUsageLimitError } from "@/shared/lib/errors";
import { TurnstileWidget, type TurnstileRef } from "@/shared/components/TurnstileWidget";

async function analyzeKeyword(keyword: string, turnstileToken?: string): Promise<AnalyzeResponse> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword, turnstileToken }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const limitErr = parseUsageLimitError(res.status, data);
    if (limitErr) throw limitErr;
    throw new Error(data.error ?? `분석 실패 (${res.status})`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// HTML strip helper
// ---------------------------------------------------------------------------

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

// ---------------------------------------------------------------------------
// Competition helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Volatility (이슈성 지수) helper
// ---------------------------------------------------------------------------

function getVolatilityInfo(data: TrendPoint[] | null) {
  if (!data || data.length < 3) return null;
  const ratios = data.map((d) => d.ratio);
  const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  if (mean === 0) return null;
  const variance = ratios.reduce((sum, r) => sum + (r - mean) ** 2, 0) / ratios.length;
  const std = Math.sqrt(variance);
  const cv = std / mean; // coefficient of variation

  if (cv < 0.15) return { label: "안정", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400", description: "에버그린 키워드" };
  if (cv < 0.30) return { label: "보통", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400", description: "일반적 변동" };
  return { label: "이슈성", color: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400", description: "일시적 유행/바이럴" };
}

// ---------------------------------------------------------------------------
// Competition helpers
// ---------------------------------------------------------------------------

function competitionBarClass(competition: string) {
  if (competition === "낮음") return "bg-emerald-500";
  if (competition === "높음") return "bg-rose-500";
  return "bg-amber-500";
}

function competitionBarWidth(competition: string) {
  if (competition === "낮음") return "30%";
  if (competition === "높음") return "85%";
  return "55%";
}

function competitionDescription(competition: string) {
  if (competition === "낮음") return "상위 노출이 비교적 쉬운 키워드입니다";
  if (competition === "높음") return "상위 노출이 어려운 키워드입니다";
  return "적당한 경쟁 강도의 키워드입니다";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KeywordTrendChart({ data, error }: { data: TrendPoint[] | null; error: boolean }) {
  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        트렌드 데이터를 불러올 수 없습니다
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="h-64 bg-muted/30 rounded-lg animate-pulse" />
    );
  }

  const sorted = [...data].sort((a, b) => a.period.localeCompare(b.period));

  if (sorted.length < 2) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        트렌드 데이터가 없습니다
      </div>
    );
  }

  const W = 700;
  const H = 240;
  const PAD = { top: 16, right: 20, bottom: 40, left: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const xStep = chartW / Math.max(sorted.length - 1, 1);

  const xOf = (i: number) => PAD.left + i * xStep;
  const yOf = (ratio: number) => PAD.top + chartH - (ratio / 100) * chartH;

  const yTicks = [0, 25, 50, 75, 100];
  const tickStep = Math.max(1, Math.floor(sorted.length / 6));
  const xTicks = sorted.filter((_, i) => i % tickStep === 0);

  const linePath = sorted
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${xOf(i)} ${yOf(pt.ratio)}`)
    .join(" ");

  const areaPath =
    `M ${xOf(0)} ${yOf(sorted[0].ratio)} ` +
    sorted.slice(1).map((pt, i) => `L ${xOf(i + 1)} ${yOf(pt.ratio)}`).join(" ") +
    ` L ${xOf(sorted.length - 1)} ${PAD.top + chartH} L ${xOf(0)} ${PAD.top + chartH} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[320px]"
        style={{ height: H }}
        aria-label="검색량 트렌드 차트"
      >
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.01} />
          </linearGradient>
        </defs>

        {yTicks.map((v) => (
          <line
            key={v}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={yOf(v)}
            y2={yOf(v)}
            stroke="currentColor"
            strokeOpacity={0.08}
            strokeWidth={1}
          />
        ))}

        {yTicks.map((v) => (
          <text
            key={v}
            x={PAD.left - 8}
            y={yOf(v) + 4}
            textAnchor="end"
            fontSize={11}
            fill="currentColor"
            fillOpacity={0.45}
          >
            {v}
          </text>
        ))}

        {xTicks.map((pt) => (
          <text
            key={pt.period}
            x={xOf(sorted.indexOf(pt))}
            y={H - 8}
            textAnchor="middle"
            fontSize={10}
            fill="currentColor"
            fillOpacity={0.45}
          >
            {pt.period.slice(0, 7)}
          </text>
        ))}

        <path d={areaPath} fill="url(#trendGradient)" />
        <path
          d={linePath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {sorted.map((pt, i) => (
          <circle
            key={pt.period}
            cx={xOf(i)}
            cy={yOf(pt.ratio)}
            r={3}
            fill="#3b82f6"
          />
        ))}
      </svg>
    </div>
  );
}

function RelatedRow({ word, vol, comp, onClick, onCompare }: { word: string; vol: string; comp: string; onClick: () => void; onCompare: () => void }) {
  const badgeCls = competitionBadgeClass(comp);

  return (
    <tr
      className="hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={onClick}
      title={`'${word}' 분석하기`}
    >
      <td className="px-6 py-4 text-sm font-semibold text-foreground/80 hover:text-primary transition-colors">{word}</td>
      <td className="px-4 py-4 text-sm text-right font-medium text-muted-foreground">{vol}</td>
      <td className="px-4 py-4 text-center whitespace-nowrap">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${badgeCls}`}>{comp}</span>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            className="size-8 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/20 shadow-sm border border-muted transition-colors"
            onClick={(e) => { e.stopPropagation(); onCompare(); }}
            title="비교하기"
          >
            <ArrowRightLeft className="size-3.5" />
          </button>
          <button
            className="size-8 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-background shadow-sm border border-muted transition-colors"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            title="분석하기"
          >
            <ArrowRight className="size-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-card p-6 rounded-xl shadow-sm border border-muted/50 animate-pulse">
      <div className="h-3 w-20 bg-muted rounded mb-4"></div>
      <div className="h-8 w-28 bg-muted rounded mb-4"></div>
      <div className="h-2 w-full bg-muted rounded"></div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </section>

      {/* Charts & Tables Row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-card p-8 rounded-xl shadow-sm border border-muted/50 animate-pulse">
          <div className="h-4 w-32 bg-muted rounded mb-8"></div>
          <div className="h-64 bg-muted/50 rounded"></div>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-muted/50 animate-pulse">
          <div className="p-6">
            <div className="h-4 w-24 bg-muted rounded"></div>
          </div>
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-muted/50 rounded"></div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="size-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
        <Search className="size-10 text-muted-foreground/50" />
      </div>
      <h3 className="text-xl font-bold text-foreground/80 mb-2">키워드를 입력해 분석을 시작하세요</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        상단 검색창에 분석하고 싶은 키워드를 입력하고 <strong>분석</strong> 버튼을 누르세요. 검색량, 경쟁도, 클릭률 등 상세 지표를 확인할 수 있습니다.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

async function toggleSavedKeyword(keyword: string, currentlySaved: boolean): Promise<boolean> {
  if (currentlySaved) {
    const res = await fetch("/api/keywords/saved", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "삭제 실패");
    }
    return false;
  } else {
    const res = await fetch("/api/keywords/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "저장 실패");
    }
    return true;
  }
}

async function fetchIsKeywordSaved(keyword: string): Promise<boolean> {
  const res = await fetch(`/api/keywords/saved?limit=200`);
  if (!res.ok) return false;
  const data = await res.json();
  return (data.keywords as Array<{ keyword: string }>).some((k) => k.keyword === keyword);
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24 text-muted-foreground">로딩 중...</div>}>
      <AnalyzePageInner />
    </Suspense>
  );
}

function AnalyzePageInner() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const autoTriggered = useRef(false);
  const [inputValue, setInputValue] = useState("");
  const [submittedKeyword, setSubmittedKeyword] = useState("");
  const [tagCopied, setTagCopied] = useState(false);
  const [trendData, setTrendData] = useState<TrendPoint[] | null>(null);
  const [trendError, setTrendError] = useState(false);
  const [allTagsCopied, setAllTagsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [bookmarkError, setBookmarkError] = useState<string | null>(null);
  const [upgradeModal, setUpgradeModal] = useState<{ used: number; limit: number } | null>(null);
  const [genderRatio, setGenderRatio] = useState<{ male: number; female: number } | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileRef>(null);
  // Restored from query cache when navigating back to a previously analyzed keyword
  const [restoredData, setRestoredData] = useState<AnalyzeResponse | null>(null);

  const { mutate, data, isPending, isError, error, reset } = useMutation({
    mutationFn: (keyword: string) => analyzeKeyword(keyword, turnstileToken ?? undefined),
    onSuccess: (result, keyword) => {
      // Cache the result so navigating away and back restores it
      queryClient.setQueryData(["analyze", keyword], result);
      // Delayed refresh: wait for fire-and-forget DB writes to complete
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["search-history"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      }, 3000);
      // Reset Turnstile for next search
      setTurnstileToken(null);
      turnstileRef.current?.reset();
    },
    onError: (err) => {
      if (err instanceof UsageLimitError) {
        setUpgradeModal({ used: err.used, limit: err.limit });
      }
      // Reset Turnstile so user can retry
      setTurnstileToken(null);
      turnstileRef.current?.reset();
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: ({ keyword, saved }: { keyword: string; saved: boolean }) =>
      toggleSavedKeyword(keyword, saved),
    onSuccess: (nextSaved) => {
      setIsSaved(nextSaved);
      setBookmarkError(null);
    },
    onError: (err: Error) => {
      setBookmarkError(err.message);
    },
  });

  // Check saved state whenever analysis result changes
  useEffect(() => {
    if (!data?.analysis?.keyword) return;
    setIsSaved(false);
    fetchIsKeywordSaved(data.analysis.keyword).then(setIsSaved).catch(() => { });
  }, [data?.analysis?.keyword]);

  // Auto-analyze from URL param: /analyze?keyword=검색어
  // Check cache first; only fetch if no cached data exists (stale after 5 min)
  useEffect(() => {
    const keyword = searchParams.get("keyword");
    if (keyword && !autoTriggered.current) {
      autoTriggered.current = true;
      setInputValue(keyword);
      setSubmittedKeyword(keyword);
      const cached = queryClient.getQueryData<AnalyzeResponse>(["analyze", keyword]);
      if (cached) {
        // Restore from cache without re-fetching
        setRestoredData(cached);
        reset();
        setIsSaved(false);
        fetchIsKeywordSaved(keyword).then(setIsSaved).catch(() => { });
        // Also restore trend/gender data from cache if available
        const cachedTrend = queryClient.getQueryData<TrendPoint[]>(["trend", keyword]);
        if (cachedTrend !== undefined) {
          setTrendData(cachedTrend);
          setTrendError(false);
        } else {
          setTrendData(null);
          setTrendError(false);
          fetchTrendData(keyword, cached.plan !== "free");
        }
        const cachedGender = queryClient.getQueryData<{ male: number; female: number } | null>(["gender", keyword]);
        if (cachedGender !== undefined) {
          setGenderRatio(cachedGender);
        }
      } else {
        setTrendData(null);
        setTrendError(false);
        reset();
        mutate(keyword);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Fetch trend data whenever analysis result changes
  useEffect(() => {
    if (!data?.analysis?.keyword) return;
    fetchTrendData(data.analysis.keyword, activeData?.plan !== "free");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.analysis?.keyword]);

  async function fetchTrendData(keyword: string, demographicsEnabled: boolean) {
    setTrendData(null);
    setTrendError(false);
    setGenderRatio(null);
    try {
      const fetches: Promise<Response>[] = [
        fetch("/api/trends", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keywords: [keyword], months: 12 }),
        }),
      ];

      if (demographicsEnabled) {
        fetches.push(
          fetch("/api/trends", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keywords: [keyword], months: 1, gender: "m" }),
          }),
          fetch("/api/trends", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keywords: [keyword], months: 1, gender: "f" }),
          }),
        );
      }

      const responses = await Promise.all(fetches);
      const trendRes = responses[0];

      if (!trendRes.ok) throw new Error();
      const trendJson = await trendRes.json();
      const points: TrendPoint[] = trendJson.trends?.[0]?.data ?? [];
      setTrendData(points);
      // Cache trend data (5 min stale time managed via cache entry timestamp)
      queryClient.setQueryData(["trend", keyword], points);

      // Gender ratio calculation (paid plans only)
      if (demographicsEnabled && responses.length === 3) {
        const maleRes = responses[1];
        const femaleRes = responses[2];
        if (maleRes.ok && femaleRes.ok) {
          const maleJson = await maleRes.json();
          const femaleJson = await femaleRes.json();
          const maleData: TrendPoint[] = maleJson.trends?.[0]?.data ?? [];
          const femaleData: TrendPoint[] = femaleJson.trends?.[0]?.data ?? [];
          const maleAvg = maleData.length > 0 ? maleData.reduce((s, d) => s + d.ratio, 0) / maleData.length : 0;
          const femaleAvg = femaleData.length > 0 ? femaleData.reduce((s, d) => s + d.ratio, 0) / femaleData.length : 0;
          const total = maleAvg + femaleAvg;
          if (total > 0) {
            const ratio = {
              male: Math.round((maleAvg / total) * 100),
              female: Math.round((femaleAvg / total) * 100),
            };
            setGenderRatio(ratio);
            queryClient.setQueryData(["gender", keyword], ratio);
          } else {
            queryClient.setQueryData(["gender", keyword], null);
          }
        }
      }
    } catch {
      setTrendError(true);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const keyword = inputValue.trim();
    if (!keyword) return;
    setSubmittedKeyword(keyword);
    setTrendData(null);
    setTrendError(false);
    setRestoredData(null);
    reset();
    mutate(keyword);
  }

  const activeData = data ?? restoredData;
  const analysis = activeData?.analysis ?? null;
  const relatedKeywords = activeData?.relatedKeywords ?? [];
  const correctedKeyword = activeData?.correctedKeyword ?? null;

  function handleRelatedKeywordClick(keyword: string) {
    setInputValue(keyword);
    setSubmittedKeyword(keyword);
    setTrendData(null);
    setTrendError(false);
    setRestoredData(null);
    reset();
    mutate(keyword);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleCopyHashtags() {
    const allKeywords = analysis
      ? [analysis.keyword, ...relatedKeywords.map((rk) => rk.keyword)]
      : relatedKeywords.map((rk) => rk.keyword);
    const text = formatKeywordsAsHashtags(allKeywords);
    const ok = await copyToClipboard(text);
    if (ok) {
      setTagCopied(true);
      setTimeout(() => setTagCopied(false), 2000);
    }
  }

  async function handleCopyAllRelatedTags() {
    const keywords = relatedKeywords.map((rk) => rk.keyword);
    const text = formatKeywordsAsTags(keywords);
    const ok = await copyToClipboard(text);
    if (ok) {
      setAllTagsCopied(true);
      setTimeout(() => setAllTagsCopied(false), 2000);
    }
  }

  const pcRatio = analysis
    ? Math.round((analysis.pcSearchVolume / Math.max(analysis.totalSearchVolume, 1)) * 100)
    : 27;
  const mobileRatio = 100 - pcRatio;

  const gradeConfig = analysis ? getKeywordGradeConfig(analysis.keywordGrade) : null;

  const monthlyClicks = analysis
    ? Math.round(analysis.totalSearchVolume * analysis.clickRate)
    : 0;

  return (
    <div className="space-y-12">
      <UpgradeModal
        isOpen={upgradeModal !== null}
        onClose={() => setUpgradeModal(null)}
        feature="키워드 검색"
        used={upgradeModal?.used ?? 0}
        limit={upgradeModal?.limit ?? 0}
      />

      <PageHeader
        icon={<Search className="size-8 text-primary" />}
        title="단일 키워드 분석"
        description="특정 키워드의 경쟁 강도, 예상 트래픽, 클릭률(CTR) 등 상세 지표를 심층 분석합니다."
      />

      {/* Search Section */}
      <section className="mb-12">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit}>
            <SearchInputWithHistory
              value={inputValue}
              onChange={setInputValue}
              onSubmit={(keyword) => {
                setSubmittedKeyword(keyword);
                setTrendData(null);
                setTrendError(false);
                reset();
                mutate(keyword);
              }}
              disabled={isPending}
              placeholder="키워드를 입력하세요"
            />
            {/* Turnstile CAPTCHA — managed 모드, 대부분 자동 통과 */}
            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
              <div className="flex justify-center mt-3">
                <TurnstileWidget
                  ref={turnstileRef}
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                  onVerify={(token) => setTurnstileToken(token)}
                  onExpire={() => setTurnstileToken(null)}
                />
              </div>
            )}
          </form>
        </div>
      </section>

      {/* Correction Notice */}
      {correctedKeyword && submittedKeyword && (
        <div className="max-w-2xl mx-auto -mt-8">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-400">
            <Info className="size-4 shrink-0" />
            <span>
              <strong>&apos;{submittedKeyword}&apos;</strong> → <strong>&apos;{correctedKeyword}&apos;</strong>로 교정되었습니다
            </span>
          </div>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-5 py-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-400">
          <AlertCircle className="size-5 shrink-0" />
          <p className="text-sm font-medium">{(error as Error)?.message ?? "분석 중 오류가 발생했습니다. 다시 시도해 주세요."}</p>
        </div>
      )}

      {/* Loading State */}
      {isPending && <LoadingSkeleton />}

      {/* Empty State */}
      {!isPending && !analysis && !isError && <EmptyState />}

      {/* Results */}
      {!isPending && analysis && (
        <>
          {/* Results Header with Tag Copy and Bookmark */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-muted-foreground">
              <span className="text-foreground">&apos;{submittedKeyword}&apos;</span> 분석 결과
            </h2>
            <div className="flex items-center gap-2">
              {/* Bookmark button */}
              <button
                onClick={() =>
                  analysis &&
                  bookmarkMutation.mutate({ keyword: analysis.keyword, saved: isSaved })
                }
                disabled={bookmarkMutation.isPending}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border transition-colors disabled:opacity-60 ${isSaved
                  ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50"
                  : "border-muted/60 bg-card hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                  }`}
                title={isSaved ? "저장 해제" : "키워드 저장"}
              >
                <Star
                  className={`size-4 transition-all ${isSaved ? "fill-amber-400 text-amber-400" : ""}`}
                />
                {isSaved ? "저장됨" : "저장"}
              </button>
              {/* Tag copy button */}
              <button
                onClick={handleCopyHashtags}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border border-muted/60 bg-card hover:bg-muted/30 transition-colors"
                title="주요 키워드 + 연관 키워드를 해시태그로 복사"
              >
                {tagCopied ? (
                  <>
                    <Check className="size-4 text-emerald-500" />
                    <span className="text-emerald-600">복사 완료!</span>
                  </>
                ) : (
                  <>
                    <Tag className="size-4 text-muted-foreground" />
                    태그 복사
                  </>
                )}
              </button>
            </div>
          </div>
          {/* Bookmark error */}
          {bookmarkError && (
            <div className="max-w-2xl mx-auto mt-2">
              <p className="text-xs text-rose-500 font-medium text-right">{bookmarkError}</p>
            </div>
          )}

          {/* Row 1: Key Metrics */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {/* Monthly Volume */}
            <div className="bg-card p-6 rounded-xl shadow-sm border border-muted/50">
              <p className="text-sm font-bold text-muted-foreground mb-2">월간 검색량</p>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-3xl font-extrabold tracking-tight">
                  {analysis.totalSearchVolume.toLocaleString("ko-KR")}
                </h2>
                {gradeConfig && (
                  <span
                    className="px-2 py-0.5 text-[11px] font-extrabold rounded text-white"
                    style={{ backgroundColor: gradeConfig.color }}
                  >
                    {analysis.keywordGrade}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">PC: {analysis.pcSearchVolume.toLocaleString("ko-KR")}</span>
                  <span className="text-muted-foreground">모바일: {analysis.mobileSearchVolume.toLocaleString("ko-KR")}</span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full flex overflow-hidden">
                  <div className="h-full bg-blue-600" style={{ width: `${pcRatio}%` }}></div>
                  <div className="h-full bg-emerald-500" style={{ width: `${mobileRatio}%` }}></div>
                </div>
              </div>
            </div>

            {/* Competition */}
            <div className="bg-card p-6 rounded-xl shadow-sm border border-muted/50">
              <p className="text-sm font-bold text-muted-foreground mb-2">경쟁도</p>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-3xl font-extrabold tracking-tight">{analysis.competition}</h2>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${competitionBadgeClass(analysis.competition)}`}>
                  {analysis.competition}
                </span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${competitionBarClass(analysis.competition)}`}
                  style={{ width: competitionBarWidth(analysis.competition) }}
                ></div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">{competitionDescription(analysis.competition)}</p>
            </div>

            {/* Monthly Clicks */}
            <div className="bg-card p-6 rounded-xl shadow-sm border border-muted/50">
              <p className="text-sm font-bold text-muted-foreground mb-2">월간 클릭수</p>
              <h2 className="text-3xl font-extrabold tracking-tight mb-2">
                {monthlyClicks.toLocaleString("ko-KR")}
              </h2>
              <div className="flex items-center gap-2 mt-4">
                <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {(analysis.clickRate * 100).toFixed(1)}%
                </span>
                <span className="text-[11px] text-muted-foreground">CTR (Click Through Rate)</span>
              </div>
            </div>

            {/* Blog Posts */}
            <div className="bg-card p-6 rounded-xl shadow-sm border border-muted/50">
              <p className="text-sm font-bold text-muted-foreground mb-2">블로그 글 수</p>
              <h2 className="text-3xl font-extrabold tracking-tight mb-4">
                {analysis.blogPostCount.toLocaleString("ko-KR")}개
              </h2>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                <TrendingUp className="size-4 text-emerald-500" />
                포화도: {analysis.saturationIndex.label}
              </div>
            </div>
          </section>

          {/* Section Analysis */}
          {analysis.sectionData && (
            <section className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <LayoutGrid className="size-5 text-primary" />
                <h3 className="text-lg font-bold">섹션 분석</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(
                  [
                    { key: "blog", label: "블로그" },
                    { key: "cafe", label: "카페" },
                    { key: "kin", label: "지식iN" },
                    { key: "shopping", label: "쇼핑" },
                  ] as const
                ).map(({ key, label }) => {
                  const section = analysis.sectionData![key];
                  return (
                    <div
                      key={key}
                      className="bg-card p-5 rounded-xl shadow-sm border border-muted/50 flex flex-col gap-3"
                    >
                      <p className="text-sm font-bold text-muted-foreground">{label}</p>
                      <p className="text-2xl font-extrabold tracking-tight">
                        {section.total.toLocaleString("ko-KR")}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`size-2 rounded-full ${section.isVisible ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
                        />
                        <span
                          className={`text-xs font-semibold ${section.isVisible ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}
                        >
                          {section.isVisible ? "노출" : "비노출"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Gender Distribution */}
          {genderRatio && (
            <section className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <Gauge className="size-5 text-primary" />
                <h3 className="text-lg font-bold">검색자 성별 분포</h3>
              </div>
              <div className="bg-card p-6 rounded-xl shadow-sm border border-muted/50">
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-blue-500" />
                    <span className="text-sm font-semibold">남성 {genderRatio.male}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-pink-500" />
                    <span className="text-sm font-semibold">여성 {genderRatio.female}%</span>
                  </div>
                </div>
                <div className="w-full h-3 bg-muted rounded-full flex overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${genderRatio.male}%` }} />
                  <div className="h-full bg-pink-500 transition-all" style={{ width: `${genderRatio.female}%` }} />
                </div>
              </div>
            </section>
          )}

          {/* Row 2: Charts & Tables */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Trend Chart */}
            <div className="lg:col-span-2 bg-card p-8 rounded-xl shadow-sm border border-muted/50">
              <div className="flex items-center gap-3 mb-6">
                <h3 className="text-lg font-bold">검색량 트렌드</h3>
                {(() => {
                  const vol = getVolatilityInfo(trendData);
                  if (!vol) return null;
                  return (
                    <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full ${vol.color}`} title={vol.description}>
                      {vol.label}
                    </span>
                  );
                })()}
              </div>
              <KeywordTrendChart data={trendData} error={trendError} />
            </div>

            {/* Related Keywords Table */}
            <div className="bg-card rounded-xl shadow-sm border border-muted/50 flex flex-col overflow-hidden">
              <div className="p-6 flex items-center justify-between">
                <h3 className="text-lg font-bold">연관 키워드</h3>
                {relatedKeywords.length > 0 && (
                  <button
                    onClick={handleCopyAllRelatedTags}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-muted/60 bg-muted/20 hover:bg-muted/50 transition-colors"
                    title="연관 키워드 전체를 쉼표 구분으로 복사"
                  >
                    {allTagsCopied ? (
                      <>
                        <Check className="size-3 text-emerald-500" />
                        <span className="text-emerald-600">복사 완료!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3 text-muted-foreground" />
                        전체 태그 복사
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-x-auto">
                {relatedKeywords.length > 0 ? (
                  <table className="w-full min-w-[360px] text-left border-collapse">
                    <thead className="bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-widest border-b border-muted/50">
                      <tr>
                        <th className="px-6 py-3">키워드</th>
                        <th className="px-4 py-3 text-right">검색량</th>
                        <th className="px-4 py-3 text-center">경쟁도</th>
                        <th className="px-6 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-muted/30">
                      {relatedKeywords.map((rk) => (
                        <RelatedRow
                          key={rk.keyword}
                          word={rk.keyword}
                          vol={(rk.pcSearchVolume + rk.mobileSearchVolume).toLocaleString("ko-KR")}
                          comp={rk.competition}
                          onClick={() => handleRelatedKeywordClick(rk.keyword)}
                          onCompare={() => {
                            window.location.href = `/compare?keywords=${encodeURIComponent(analysis!.keyword)},${encodeURIComponent(rk.keyword)}`;
                          }}
                        />
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-6 py-8 text-sm text-muted-foreground text-center">연관 키워드가 없습니다</div>
                )}
              </div>
            </div>
          </section>

          {/* Top Posts */}
          {analysis.topPosts && analysis.topPosts.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="size-5 text-primary" />
                <h3 className="text-lg font-bold">인기글 TOP7</h3>
              </div>
              <div className="bg-card rounded-xl shadow-sm border border-muted/50 divide-y divide-muted/30">
                {analysis.topPosts.map((post, index) => {
                  const year = post.postdate.slice(0, 4);
                  const month = post.postdate.slice(4, 6);
                  const day = post.postdate.slice(6, 8);
                  const formattedDate = `${year}.${month}.${day}`;
                  return (
                    <a
                      key={index}
                      href={post.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-4 px-6 py-4 hover:bg-muted/30 transition-colors group"
                    >
                      <span className="shrink-0 mt-0.5 text-sm font-extrabold text-muted-foreground/50 w-5 text-center">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground/90 truncate group-hover:text-primary transition-colors">
                          {stripHtml(post.title)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {post.bloggerName} · {formattedDate}
                        </p>
                      </div>
                      <ExternalLink className="size-4 shrink-0 text-muted-foreground/40 group-hover:text-primary transition-colors mt-0.5" />
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          {/* Row 3: Quick Actions */}
          <section className="mb-12">
            <h3 className="text-lg font-bold mb-6">빠른 실행</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Compare */}
              <a
                href={`/compare?keywords=${encodeURIComponent(analysis.keyword)}`}
                className="group flex items-center justify-between p-6 bg-card rounded-xl shadow-sm border border-muted/50 text-left hover:border-primary/30 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="size-12 bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 rounded-full flex items-center justify-center">
                    <ArrowRightLeft className="size-6" />
                  </div>
                  <div>
                    <h4 className="font-bold">키워드 비교</h4>
                    <p className="text-xs text-muted-foreground mt-1">다른 키워드와 비교 분석</p>
                  </div>
                </div>
                <ArrowRight className="text-muted-foreground group-hover:text-primary size-5 transition-colors" />
              </a>

              {/* AI Title */}
              <a
                href={`/ai?keyword=${encodeURIComponent(analysis.keyword)}&tab=title`}
                className="group flex items-center justify-between p-6 bg-card rounded-xl shadow-sm border border-muted/50 text-left hover:border-primary/30 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="size-12 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center">
                    <Sparkles className="size-6" />
                  </div>
                  <div>
                    <h4 className="font-bold">AI 제목 추천</h4>
                    <p className="text-xs text-muted-foreground mt-1">클릭률 높은 제목 생성</p>
                  </div>
                </div>
                <ArrowRight className="text-muted-foreground group-hover:text-primary size-5 transition-colors" />
              </a>

              {/* AI Draft */}
              <a
                href={`/ai?keyword=${encodeURIComponent(analysis.keyword)}&tab=draft`}
                className="group flex items-center justify-between p-6 bg-card rounded-xl shadow-sm border border-muted/50 text-left hover:border-primary/30 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="size-12 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
                    <FileText className="size-6" />
                  </div>
                  <div>
                    <h4 className="font-bold">AI 글 초안 생성</h4>
                    <p className="text-xs text-muted-foreground mt-1">블로그 포스팅 초안 작성</p>
                  </div>
                </div>
                <ArrowRight className="text-muted-foreground group-hover:text-primary size-5 transition-colors" />
              </a>
            </div>
          </section>

          {/* Bottom Actions */}
          <footer className="flex justify-center gap-4 border-t border-muted/50 pt-10">
            <button
              onClick={() =>
                analysis &&
                bookmarkMutation.mutate({ keyword: analysis.keyword, saved: isSaved })
              }
              disabled={bookmarkMutation.isPending}
              className={`px-10 py-4 rounded-xl font-bold shadow-lg transition-all disabled:opacity-60 ${isSaved
                ? "bg-amber-500 text-white shadow-amber-500/20 hover:bg-amber-600"
                : "bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90"
                }`}
            >
              <span className="flex items-center gap-2">
                <Star className={`size-5 ${isSaved ? "fill-white" : ""}`} />
                {bookmarkMutation.isPending ? "처리 중…" : isSaved ? "저장됨" : "키워드 저장"}
              </span>
            </button>
            <a
              href={`/compare?keywords=${encodeURIComponent(analysis.keyword)}`}
              className="px-10 py-4 bg-muted/50 text-foreground rounded-xl font-bold hover:bg-muted transition-colors flex items-center gap-2"
            >
              <ArrowRightLeft className="size-5" />
              비교에 추가
            </a>
          </footer>
        </>
      )}
    </div>
  );
}
