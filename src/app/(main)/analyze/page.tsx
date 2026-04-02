"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Search,
  TrendingUp,
  ArrowRight,
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
import { copyToClipboard, formatKeywordsAsHashtags, formatKeywordsAsTags } from "@/shared/lib/clipboard";
import { UpgradeModal } from "@/shared/components/UpgradeModal";

// ---------------------------------------------------------------------------
// API types
// ---------------------------------------------------------------------------

interface AnalyzeResponse {
  analysis: KeywordSearchResult;
  relatedKeywords: RelatedKeyword[];
  correctedKeyword: string | null;
}

// ---------------------------------------------------------------------------
// Inline fetch function (W4에서 feature hook으로 이전 예정)
// ---------------------------------------------------------------------------

class UsageLimitError extends Error {
  used: number;
  limit: number;
  constructor(message: string, used: number, limit: number) {
    super(message);
    this.name = "UsageLimitError";
    this.used = used;
    this.limit = limit;
  }
}

async function analyzeKeyword(keyword: string): Promise<AnalyzeResponse> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 429 && data.code === "USAGE_LIMIT_EXCEEDED") {
      const match = /\((\d+)\/(\d+)\)/.exec(data.error ?? "");
      const used = match ? parseInt(match[1], 10) : 0;
      const limit = match ? parseInt(match[2], 10) : 0;
      throw new UsageLimitError(data.error ?? "일일 사용 한도를 초과했습니다.", used, limit);
    }
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
// Competition badge helper
// ---------------------------------------------------------------------------

function competitionBadgeClass(competition: string) {
  if (competition === "낮음") return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
  if (competition === "높음") return "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400";
  return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
}

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

function TrendBar({ h1, h2, fill, border }: { h1: string; h2: string; fill?: boolean; border?: boolean }) {
  const cls1 = fill ? "bg-blue-600" : border ? "bg-blue-600/70" : "bg-blue-600/30";
  const cls2 = fill ? "bg-emerald-500" : border ? "bg-emerald-500/70" : "bg-emerald-500/30";

  return (
    <div className="flex-1 flex flex-col justify-end gap-1">
      <div className={`w-full rounded-t-sm ${cls1} h-${h1}`}></div>
      <div className={`w-full rounded-t-sm ${cls2} h-${h2}`}></div>
    </div>
  );
}

function RelatedRow({ word, vol, comp, onClick }: { word: string; vol: string; comp: string; onClick: () => void }) {
  const badgeCls = competitionBadgeClass(comp);

  return (
    <tr
      className="hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={onClick}
      title={`'${word}' 분석하기`}
    >
      <td className="px-6 py-4 text-sm font-semibold text-foreground/80 hover:text-primary transition-colors">{word}</td>
      <td className="px-4 py-4 text-sm text-right font-medium text-muted-foreground">{vol}</td>
      <td className="px-4 py-4 text-center">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${badgeCls}`}>{comp}</span>
      </td>
      <td className="px-6 py-4 text-right">
        <button
          className="size-8 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-background shadow-sm border border-muted transition-colors"
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          title="분석하기"
        >
          <ArrowRight className="size-4" />
        </button>
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
  const [inputValue, setInputValue] = useState("");
  const [submittedKeyword, setSubmittedKeyword] = useState("");
  const [tagCopied, setTagCopied] = useState(false);
  const [allTagsCopied, setAllTagsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [bookmarkError, setBookmarkError] = useState<string | null>(null);
  const [upgradeModal, setUpgradeModal] = useState<{ used: number; limit: number } | null>(null);

  const { mutate, data, isPending, isError, error, reset } = useMutation({
    mutationFn: analyzeKeyword,
    onError: (err) => {
      if (err instanceof UsageLimitError) {
        setUpgradeModal({ used: err.used, limit: err.limit });
      }
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
    fetchIsKeywordSaved(data.analysis.keyword).then(setIsSaved).catch(() => {});
  }, [data?.analysis?.keyword]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const keyword = inputValue.trim();
    if (!keyword) return;
    setSubmittedKeyword(keyword);
    reset();
    mutate(keyword);
  }

  const analysis = data?.analysis ?? null;
  const relatedKeywords = data?.relatedKeywords ?? [];
  const correctedKeyword = data?.correctedKeyword ?? null;

  function handleRelatedKeywordClick(keyword: string) {
    setInputValue(keyword);
    setSubmittedKeyword(keyword);
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
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <Search className="text-muted-foreground size-5" />
            </div>
            <input
              className="w-full pl-14 pr-32 py-5 bg-card border-none rounded-2xl shadow-xl shadow-muted/50 focus:ring-2 focus:ring-primary text-lg font-medium placeholder:text-muted-foreground outline-none transition-all"
              placeholder="키워드를 입력하세요"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isPending}
            />
            <button
              type="submit"
              disabled={isPending || !inputValue.trim()}
              className="absolute right-3 inset-y-3 px-8 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending ? "분석 중…" : "분석"}
            </button>
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
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border transition-colors disabled:opacity-60 ${
                  isSaved
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

          {/* Row 2: Charts & Tables */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Trend Chart — TODO: W4에서 데이터랩 API 연결 */}
            <div className="lg:col-span-2 bg-card p-8 rounded-xl shadow-sm border border-muted/50">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-lg font-bold">검색량 트렌드</h3>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    <span className="text-xs font-medium text-muted-foreground">PC</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-medium text-muted-foreground">Mobile</span>
                  </div>
                </div>
              </div>
              {/* Simulated trend bars — TODO: W4에서 데이터랩 API 연결 */}
              <div className="h-64 flex items-end justify-between gap-2 px-2">
                <TrendBar h1="12" h2="24" />
                <TrendBar h1="14" h2="28" />
                <TrendBar h1="16" h2="32" />
                <TrendBar h1="20" h2="36" />
                <TrendBar h1="24" h2="40" />
                <TrendBar h1="28" h2="44" />
                <TrendBar h1="32" h2="48" />
                <TrendBar h1="36" h2="52" />
                <TrendBar h1="40" h2="56" fill />
                <TrendBar h1="44" h2="60" border />
                <TrendBar h1="38" h2="54" border />
                <TrendBar h1="34" h2="50" border />
              </div>
              <div className="flex justify-between mt-4 px-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                <span>1월</span><span>2월</span><span>3월</span><span>4월</span><span>5월</span><span>6월</span><span>7월</span><span>8월</span><span>9월</span><span>10월</span><span>11월</span><span>12월</span>
              </div>
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
              <div className="flex-1 overflow-auto">
                {relatedKeywords.length > 0 ? (
                  <table className="w-full text-left border-collapse">
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

          {/* Row 3: AI Quick Actions */}
          <section className="mb-12">
            <h3 className="text-lg font-bold mb-6">AI 분석 및 생성</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              <button
                disabled
                title="준비 중"
                className="group flex items-center justify-between p-6 bg-card rounded-xl shadow-sm border border-muted/50 text-left opacity-50 cursor-not-allowed"
              >
                <div className="flex items-center gap-4">
                  <div className="size-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                    <Sparkles className="size-6" />
                  </div>
                  <div>
                    <h4 className="font-bold">AI 제목 추천 받기</h4>
                    <p className="text-xs text-muted-foreground mt-1">클릭률 높은 제목 10선</p>
                    <p className="text-[10px] text-amber-600 font-semibold mt-0.5">준비 중</p>
                  </div>
                </div>
                <ArrowRight className="text-muted-foreground size-5" />
              </button>

              <button
                disabled
                title="준비 중"
                className="group flex items-center justify-between p-6 bg-card rounded-xl shadow-sm border border-muted/50 text-left opacity-50 cursor-not-allowed"
              >
                <div className="flex items-center gap-4">
                  <div className="size-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                    <FileText className="size-6" />
                  </div>
                  <div>
                    <h4 className="font-bold">AI 글 초안 생성</h4>
                    <p className="text-xs text-muted-foreground mt-1">블로그 포스팅 아웃라인</p>
                    <p className="text-[10px] text-amber-600 font-semibold mt-0.5">준비 중</p>
                  </div>
                </div>
                <ArrowRight className="text-muted-foreground size-5" />
              </button>

              <button
                disabled
                title="준비 중"
                className="group flex items-center justify-between p-6 bg-card rounded-xl shadow-sm border border-muted/50 text-left opacity-50 cursor-not-allowed"
              >
                <div className="flex items-center gap-4">
                  <div className="size-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
                    <Gauge className="size-6" />
                  </div>
                  <div>
                    <h4 className="font-bold">콘텐츠 점수 측정</h4>
                    <p className="text-xs text-muted-foreground mt-1">상위 노출 확률 분석</p>
                    <p className="text-[10px] text-amber-600 font-semibold mt-0.5">준비 중</p>
                  </div>
                </div>
                <ArrowRight className="text-muted-foreground size-5" />
              </button>

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
              className={`px-10 py-4 rounded-xl font-bold shadow-lg transition-all disabled:opacity-60 ${
                isSaved
                  ? "bg-amber-500 text-white shadow-amber-500/20 hover:bg-amber-600"
                  : "bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90"
              }`}
            >
              <span className="flex items-center gap-2">
                <Star className={`size-5 ${isSaved ? "fill-white" : ""}`} />
                {bookmarkMutation.isPending ? "처리 중…" : isSaved ? "저장됨" : "키워드 저장"}
              </span>
            </button>
            <button
              disabled
              title="준비 중"
              className="px-10 py-4 bg-muted/50 text-foreground rounded-xl font-bold opacity-50 cursor-not-allowed"
            >
              비교에 추가
            </button>
          </footer>
        </>
      )}
    </div>
  );
}
