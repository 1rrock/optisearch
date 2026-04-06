"use client";

import { Search, Bookmark, Verified, Minus, Flame, Zap, Plus, Sparkles, Settings, Download } from "lucide-react";
import { PLAN_LIMITS, PLAN_PRICING, type PlanId } from "@/shared/config/constants";
import { useDashboardData } from "@/shared/hooks/use-user";
import { exportToExcel } from "@/shared/lib/excel";
import { useState } from "react";
import { useRouter } from "next/navigation";


function CircleProgress({ value, max, color }: { value: number; max: number; color: string }) {
  const circumference = 2 * Math.PI * 24;
  const pct = max <= 0 ? 0 : Math.min(value / max, 1);
  const offset = circumference * (1 - pct);
  const pctLabel = max <= 0 ? "∞" : `${Math.round(pct * 100)}%`;

  return (
    <div className="relative h-14 w-14">
      <svg className="h-full w-full transform -rotate-90">
        <circle className="text-muted" cx="28" cy="28" fill="transparent" r="24" stroke="currentColor" strokeWidth="4" />
        <circle
          cx="28"
          cy="28"
          fill="transparent"
          r="24"
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeWidth="4"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color }}>
        {pctLabel}
      </div>
    </div>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted/50 ${className ?? ""}`} />;
}

function planLabel(plan: PlanId): string {
  return PLAN_PRICING[plan]?.label ?? plan;
}

export default function DashboardPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { plan, usage, recentSearches, savedKeywordsCount, initialized } = useDashboardData();

  const effectivePlan = plan;

  const limits = PLAN_LIMITS[effectivePlan];
  const searchLimit = limits.dailySearch;
  const titleLimit = limits.dailyTitle;
  const aiUsed = usage.title + usage.draft + usage.score;
  const aiLimit = titleLimit + limits.dailyDraft + limits.dailyScore;

  function handleSearch() {
    const q = query.trim();
    if (q) {
      router.push(`/analyze?keyword=${encodeURIComponent(q)}`);
    } else {
      router.push("/analyze");
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSearch();
  }

  async function handleExportHistory() {
    setIsExporting(true);
    try {
      const res = await fetch("/api/history");
      if (!res.ok) throw new Error("Failed to fetch history");
      const { history } = await res.json();
      const rows = (history as Array<{
        keyword: string;
        pcSearchVolume: number;
        mobileSearchVolume: number;
        totalSearchVolume: number;
        competition: string;
        saturationIndex: number | null;
        keywordGrade: string;
        createdAt: string;
      }>).map((item) => ({
        키워드: item.keyword,
        PC검색량: item.pcSearchVolume,
        모바일검색량: item.mobileSearchVolume,
        총검색량: item.totalSearchVolume,
        경쟁도: item.competition,
        포화지수: item.saturationIndex ?? "",
        등급: item.keywordGrade ?? "",
        검색일시: new Date(item.createdAt).toLocaleString("ko-KR"),
      }));
      exportToExcel(rows, `검색기록_${new Date().toISOString().slice(0, 10)}`);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-8">

      {/* 1. Top Section: Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 오늘 검색 */}
        <div className="bg-card p-6 rounded-xl shadow-sm flex items-center justify-between border border-transparent hover:border-primary/20 transition-all">
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">오늘 검색</p>
            <div className="flex items-baseline gap-1">
              {initialized ? (
                <>
                  <h3 className="text-2xl font-bold text-foreground">{usage.search}</h3>
                  <span className="text-muted-foreground text-sm font-medium">
                    / {searchLimit === -1 ? "∞" : searchLimit}
                  </span>
                </>
              ) : (
                <SkeletonBlock className="h-8 w-20" />
              )}
            </div>
          </div>
          {initialized ? (
            <CircleProgress value={usage.search} max={searchLimit} color="hsl(var(--primary))" />
          ) : (
            <SkeletonBlock className="h-14 w-14 rounded-full" />
          )}
        </div>

        {/* AI 사용 */}
        <div className="bg-card p-6 rounded-xl shadow-sm flex items-center justify-between border border-transparent hover:border-primary/20 transition-all">
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">AI 사용</p>
            <div className="flex items-baseline gap-1">
              {initialized ? (
                <>
                  <h3 className="text-2xl font-bold text-foreground">{aiUsed}</h3>
                  <span className="text-muted-foreground text-sm font-medium">
                    / {aiLimit === -1 ? "∞" : aiLimit}
                  </span>
                </>
              ) : (
                <SkeletonBlock className="h-8 w-20" />
              )}
            </div>
          </div>
          {initialized ? (
            <CircleProgress value={aiUsed} max={aiLimit} color="#10b981" />
          ) : (
            <SkeletonBlock className="h-14 w-14 rounded-full" />
          )}
        </div>

        {/* 저장 키워드 */}
        <div className="bg-card p-6 rounded-xl shadow-sm flex items-center justify-between border border-transparent hover:border-primary/20 transition-all">
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">저장 키워드</p>
            <div className="flex items-baseline gap-1">
              {initialized ? (
                <>
                  <h3 className="text-2xl font-bold text-foreground">{savedKeywordsCount}</h3>
                  <span className="text-muted-foreground text-sm font-medium">개</span>
                </>
              ) : (
                <SkeletonBlock className="h-8 w-16" />
              )}
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Bookmark className="size-6" />
          </div>
        </div>

        {/* 현재 플랜 - available immediately from store defaults or session */}
        <div className="bg-card p-6 rounded-xl shadow-sm flex items-center justify-between border border-transparent hover:border-primary/20 transition-all">
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">현재 플랜</p>
            <div className="flex items-baseline gap-1">
              {initialized ? (
                <h3 className="text-2xl font-bold text-foreground">{planLabel(effectivePlan)}</h3>
              ) : (
                <SkeletonBlock className="h-8 w-24" />
              )}
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <Verified className="size-6" />
          </div>
        </div>
      </div>

      {/* 2. Middle Section: Search */}
      <section className="bg-card p-5 sm:p-10 rounded-xl shadow-sm border border-muted/50">
        <div className="max-w-3xl mx-auto text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight mb-2">어떤 키워드를 분석해드릴까요?</h2>
          <p className="text-muted-foreground text-sm">실시간 네이버 검색량과 AI 기반 경쟁 강도를 즉시 확인하세요.</p>
        </div>
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-3 p-2 bg-muted/30 rounded-2xl border-2 border-transparent focus-within:border-primary/20 focus-within:bg-card transition-all">
            <input
              className="flex-1 bg-transparent border-none outline-none ring-0 px-4 text-lg font-medium placeholder:text-muted-foreground"
              placeholder="키워드를 입력하세요..."
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <button
              onClick={handleSearch}
              className="bg-primary text-primary-foreground px-5 sm:px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all shrink-0"
            >
              키워드 검색하기
            </button>
          </div>
          {recentSearches.length > 0 && (
            <div className="flex items-center gap-3 mt-6 justify-center flex-wrap">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mr-2">최근 검색</span>
              {recentSearches.slice(0, 3).map((s) => (
                <a
                  key={s.keyword + s.createdAt}
                  href={`/analyze?q=${encodeURIComponent(s.keyword)}`}
                  className="px-4 py-1.5 bg-muted/60 hover:bg-muted text-foreground text-sm rounded-full transition-colors font-medium border border-transparent"
                >
                  {s.keyword}
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3. Bottom Section: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left: Recent Searches List */}
        <section className="lg:col-span-7 bg-card rounded-xl shadow-sm overflow-hidden border border-muted/50">
          <div className="px-6 py-5 border-b border-muted/50 flex justify-between items-center bg-muted/10">
            <h3 className="text-lg font-bold tracking-tight">최근 검색 키워드</h3>
            <div className="flex items-center gap-3">
              {limits.historyExcelEnabled && (
                <button
                  onClick={handleExportHistory}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="size-3.5" />
                  {isExporting ? "내보내는 중..." : "엑셀 내보내기"}
                </button>
              )}
            </div>
          </div>
          {!initialized ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <SkeletonBlock className="h-5 flex-1" />
                  <SkeletonBlock className="h-5 w-20" />
                  <SkeletonBlock className="h-5 w-12" />
                  <SkeletonBlock className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : recentSearches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Search className="size-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">아직 검색 기록이 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="px-6 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">키워드</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-widest text-right">검색량</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-widest text-center">등급</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-widest text-right">날짜</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted/30">
                  {recentSearches.map((s) => (
                    <tr key={s.keyword + s.createdAt} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-semibold">{s.keyword}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-muted-foreground">
                        {s.totalVolume.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {s.grade ? (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full">
                            {s.grade}
                          </span>
                        ) : (
                          <Minus className="size-4 text-muted-foreground mx-auto" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-muted-foreground font-medium">
                        {new Date(s.createdAt).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Right: Usage Summary */}
        <section className="lg:col-span-5 bg-card rounded-xl shadow-sm border border-muted/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-muted/50 flex justify-between items-center bg-muted/10">
            <h3 className="text-lg font-bold tracking-tight">오늘의 사용 현황</h3>
            <Sparkles className="size-5 text-muted-foreground" />
          </div>
          <div className="p-4 space-y-3">
            {/* Search usage */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-transparent hover:border-primary/20 transition-all">
              <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shadow-sm">
                <Search className="size-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">키워드 검색</p>
                {initialized ? (
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                    {usage.search} / {searchLimit === -1 ? "무제한" : searchLimit} 회
                  </p>
                ) : (
                  <SkeletonBlock className="h-3 w-24 mt-1" />
                )}
              </div>
              {initialized && searchLimit !== -1 && usage.search >= searchLimit && (
                <div className="px-3 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-xs font-bold rounded-full">
                  한도 도달
                </div>
              )}
            </div>

            {/* Title usage */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-transparent hover:border-primary/20 transition-all">
              <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shadow-sm">
                <Flame className="size-5 text-emerald-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">AI 제목 추천</p>
                {initialized ? (
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                    {usage.title} / {titleLimit === -1 ? "무제한" : titleLimit} 회
                  </p>
                ) : (
                  <SkeletonBlock className="h-3 w-24 mt-1" />
                )}
              </div>
              {initialized && titleLimit !== -1 && usage.title >= titleLimit && (
                <div className="px-3 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-xs font-bold rounded-full">
                  한도 도달
                </div>
              )}
            </div>

            {/* Draft usage */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-transparent hover:border-primary/20 transition-all">
              <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shadow-sm">
                <Zap className="size-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">AI 초안 생성</p>
                {initialized ? (
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                    {usage.draft} / {limits.dailyDraft === -1 ? "무제한" : limits.dailyDraft === 0 ? "미지원" : limits.dailyDraft} 회
                  </p>
                ) : (
                  <SkeletonBlock className="h-3 w-24 mt-1" />
                )}
              </div>
            </div>

            {/* Score usage */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-transparent hover:border-primary/20 transition-all">
              <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shadow-sm">
                <Settings className="size-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">SEO 점수 분석</p>
                {initialized ? (
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                    {usage.score} / {limits.dailyScore === -1 ? "무제한" : limits.dailyScore === 0 ? "미지원" : limits.dailyScore} 회
                  </p>
                ) : (
                  <SkeletonBlock className="h-3 w-24 mt-1" />
                )}
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* FAB: Navigate to analyze */}
      <button
        onClick={() => router.push("/analyze")}
        className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 w-12 h-12 sm:w-14 sm:h-14 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50"
        title="키워드 검색하기"
      >
        <Plus className="size-6 sm:size-8" />
      </button>

    </div>
  );
}
