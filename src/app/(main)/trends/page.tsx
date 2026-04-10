"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Loader2,
  AlertCircle,
  Flame,
  Sparkles,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronDown,
  ExternalLink,
  Newspaper,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { PageHeader } from "@/shared/ui/page-header";
import type { TrendingWordCloudItem } from "@/features/trends/ui/TrendingWordCloud";

const TrendingWordCloud = dynamic(
  () => import("@/features/trends/ui/TrendingWordCloud").then((mod) => mod.TrendingWordCloud),
  { ssr: false }
);

// ---------------------------------------------------------------------------
// Main Page — Sections: Trending → News Cards → New Keywords → Seasonal
// ---------------------------------------------------------------------------

export default function TrendsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={<TrendingUp className="size-8 text-primary" />}
        title="키워드 트렌드"
        description="실시간 인기 키워드 · 뉴스 · 새 키워드 · 시즌 키워드"
      />

      <TrendingSectionWrapper />
      <NewsCardGridSection />
      <NewKeywordsSection />
      <SeasonalKeywordsSection />
    </div>
  );
}

// ===========================================================================
// News Card Grid Section — clickable news article cards from trending data
// ===========================================================================

type NewsCardItem = {
  keyword: string;
  newsTitle: string;
  newsLink: string;
  changeRate: number;
  direction: "up" | "down" | "stable";
};

function NewsCardGridSection() {
  const { data, isLoading } = useQuery<{
    keywords: Array<{
      keyword: string;
      newsTitle?: string | null;
      newsLink?: string | null;
      changeRate: number;
      direction: "up" | "down" | "stable";
    }>;
  }>({
    queryKey: ["trending-keywords", "daily"],
    queryFn: async () => {
      const res = await fetch("/api/keywords/trending?period=daily");
      if (!res.ok) throw new Error("Failed to fetch trending keywords");
      return res.json();
    },
    refetchInterval: 15 * 60 * 1000,
  });

  const newsCards: NewsCardItem[] = (data?.keywords ?? [])
    .filter((kw): kw is NewsCardItem =>
      kw.newsTitle != null && kw.newsTitle !== "" && kw.newsLink != null && kw.newsLink !== ""
    );

  if (isLoading) {
    return (
      <div className="bg-card border border-muted/50 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Newspaper className="size-5 text-blue-500" />
          <h3 className="text-lg font-bold">트렌드 뉴스</h3>
        </div>
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (newsCards.length === 0) return null;

  return (
    <div className="bg-card border border-muted/50 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <Newspaper className="size-5 text-blue-500" />
        <h3 className="text-lg font-bold">트렌드 뉴스</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {newsCards.map((card) => (
          <a
            key={card.keyword}
            href={card.newsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col gap-2 p-4 rounded-xl bg-muted/20 hover:bg-muted/40 dark:bg-white/5 dark:hover:bg-white/10 border border-muted/30 hover:border-primary/30 transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                {card.keyword}
              </span>
              <span className={cn(
                "text-xs font-bold flex items-center gap-0.5",
                card.direction === "up" ? "text-rose-500" : card.direction === "down" ? "text-blue-500" : "text-muted-foreground"
              )}>
                {card.direction === "up" ? <ArrowUpRight className="size-3" /> : card.direction === "down" ? <ArrowDownRight className="size-3" /> : null}
                {Math.abs(card.changeRate)}%
              </span>
            </div>
            <p className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors line-clamp-2">
              {card.newsTitle}
            </p>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-auto">
              <ExternalLink className="size-2.5" />
              기사 보기
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ===========================================================================
// New Keywords Section — standalone (was inside DiscoverySectionWrapper tab)
// ===========================================================================

function NewKeywordsSection() {
  return (
    <div className="bg-card border border-muted/50 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-6 pt-5 pb-3">
        <Sparkles className="size-5 text-violet-500" />
        <h3 className="text-lg font-bold">새 키워드</h3>
      </div>
      <div className="px-6 pb-6">
        <NewKeywordsContent />
      </div>
    </div>
  );
}

// ===========================================================================
// Seasonal Keywords Section — standalone (was inside DiscoverySectionWrapper tab)
// ===========================================================================

function SeasonalKeywordsSection() {
  return (
    <div className="bg-card border border-muted/50 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-6 pt-5 pb-3">
        <CalendarDays className="size-5 text-amber-500" />
        <h3 className="text-lg font-bold">시즌 키워드</h3>
      </div>
      <div className="px-6 pb-6">
        <SeasonalKeywordsContent />
      </div>
    </div>
  );
}

// ===========================================================================
// Trending Keywords Section — WordCloud + Ranked List (side by side)
// ===========================================================================

type TrendingSort = "changeRate" | "volume";
type TrendingOrder = "desc" | "asc";
type TrendingView = "cloud" | "table";

type TrendingKw = TrendingWordCloudItem;

function TrendingSectionWrapper() {
  const [period, setPeriod] = useState<"daily" | "monthly">("daily");
  const [sort, setSort] = useState<TrendingSort>("changeRate");
  const [order, setOrder] = useState<TrendingOrder>("desc");
  const [view, setView] = useState<TrendingView>("cloud");

  const { data, isLoading, isError } = useQuery<{ period: string; keywords: TrendingKw[]; lastUpdated?: string }>({
    queryKey: ["trending-keywords", period],
    queryFn: async () => {
      const res = await fetch(`/api/keywords/trending?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch trending keywords");
      return res.json();
    },
    refetchInterval: 15 * 60 * 1000,
  });

  const rawKeywords = data?.keywords ?? [];

  // Sort
  const keywords = [...rawKeywords].sort((a, b) => {
    const valA = sort === "volume" ? a.volume : Math.abs(a.changeRate);
    const valB = sort === "volume" ? b.volume : Math.abs(b.changeRate);
    return order === "desc" ? valB - valA : valA - valB;
  });

  function toggleSort(field: TrendingSort) {
    if (sort === field) {
      setOrder((o) => (o === "desc" ? "asc" : "desc"));
    } else {
      setSort(field);
      setOrder("desc");
    }
  }

  const sortIcon = (field: TrendingSort) => {
    if (sort !== field) return "";
    return order === "desc" ? " ↓" : " ↑";
  };

  return (
    <div className="bg-gradient-to-br from-orange-50/50 to-amber-50/30 dark:from-orange-950/20 dark:to-amber-950/10 border border-muted/50 border-l-4 border-l-orange-500 rounded-2xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Flame className="size-5 text-orange-500" />
            인기 급상승 키워드
          </h3>
          {data?.lastUpdated && (
            <span className="text-xs text-muted-foreground">
              마지막 업데이트: {new Date(data.lastUpdated + "T00:00:00+09:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex gap-1 bg-white/60 dark:bg-white/10 rounded-full p-0.5">
            <button
              type="button"
              onClick={() => setView("cloud")}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-semibold transition-all",
                view === "cloud" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              )}
              title="워드클라우드"
              aria-label="워드클라우드 뷰"
            >
              Cloud
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-semibold transition-all",
                view === "table" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              )}
              title="테이블"
              aria-label="테이블 뷰"
            >
              Table
            </button>
          </div>
          {/* Period toggle */}
          <div className="flex gap-1.5">
            {(["daily", "monthly"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
                  period === p
                    ? "bg-foreground text-background border-foreground"
                    : "bg-white/60 dark:bg-white/10 text-muted-foreground border-muted/50 hover:border-foreground/30"
                )}
              >
                {p === "daily" ? "일간" : "월간"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-10 text-destructive text-sm">
          <AlertCircle className="size-8 mb-2 opacity-50" />
          데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </div>
      ) : keywords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm">
          <TrendingUp className="size-8 mb-2 opacity-30" />
          데이터가 쌓이면 급상승 키워드가 표시됩니다.
        </div>
      ) : view === "cloud" ? (
        /* -------- Cloud View: side-by-side on desktop -------- */
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Word cloud — 2/3 width on desktop */}
          <div className="lg:w-2/3 bg-white/40 dark:bg-white/5 rounded-xl border border-muted/20">
            <TrendingWordCloud keywords={keywords} />
          </div>

          {/* Top 10 ranked list — 1/3 width */}
          <div className="lg:w-1/3 space-y-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
              Top 10 순위
            </div>
            {keywords.slice(0, 10).map((kw, idx) => (
              <button
                key={kw.keyword}
                type="button"
                onClick={() => window.open(`/analyze?keyword=${encodeURIComponent(kw.keyword)}`, '_blank')}
                className="flex items-center gap-3 py-2.5 px-2 hover:bg-white/60 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-left w-full"
              >
                <span className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0",
                  idx < 3 ? "bg-orange-500 text-white" : "bg-muted/50 text-muted-foreground"
                )}>
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold truncate block">{kw.keyword}</span>
                  {kw.newsTitle && (
                    <span className="text-[10px] text-muted-foreground truncate block mt-0.5">
                      {kw.newsTitle}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className={cn(
                    "text-xs font-bold",
                    kw.direction === "up" ? "text-rose-500" : kw.direction === "down" ? "text-blue-500" : "text-muted-foreground"
                  )}>
                    {kw.direction === "up" ? <ArrowUpRight className="size-3 inline" /> : kw.direction === "down" ? <ArrowDownRight className="size-3 inline" /> : null}
                    {Math.abs(kw.changeRate)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {kw.volume > 0 ? `${(kw.volume / 10000).toFixed(1)}만` : ""}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* -------- Table View -------- */
        <div className="overflow-x-auto bg-white/40 dark:bg-white/5 rounded-xl border border-muted/20">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-muted/30 text-muted-foreground text-xs">
                <th className="text-left py-2.5 px-4 font-semibold w-10">#</th>
                <th className="text-left py-2.5 pr-4 font-semibold">키워드</th>
                <th className="text-left py-2.5 pr-4 font-semibold hidden md:table-cell">관련 뉴스</th>
                <th
                  className="text-right py-2.5 pr-4 font-semibold cursor-pointer hover:text-foreground transition-colors select-none"
                  onClick={() => toggleSort("volume")}
                >
                  검색량{sortIcon("volume")}
                </th>
                <th
                  className="text-right py-2.5 pr-4 font-semibold cursor-pointer hover:text-foreground transition-colors select-none"
                  onClick={() => toggleSort("changeRate")}
                >
                  변동률{sortIcon("changeRate")}
                </th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((kw, idx) => (
                <tr
                  key={kw.keyword}
                  className="border-b border-muted/15 hover:bg-white/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => window.open(`/analyze?keyword=${encodeURIComponent(kw.keyword)}`, '_blank')}
                >
                  <td className="py-3 px-4 font-bold text-muted-foreground">{idx + 1}</td>
                  <td className="py-3 pr-4 font-semibold">{kw.keyword}</td>
                  <td className="py-3 pr-4 hidden md:table-cell max-w-[260px]">
                    {kw.newsTitle ? (
                      kw.newsLink ? (
                        <a
                          href={kw.newsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors truncate block group"
                        >
                          <span className="truncate">{kw.newsTitle}</span>
                          <ExternalLink className="size-2.5 inline ml-1 opacity-0 group-hover:opacity-60 transition-opacity" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground truncate block">{kw.newsTitle}</span>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground/40">-</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right text-muted-foreground">
                    {kw.volume > 0 ? kw.volume.toLocaleString() : "-"}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5 font-bold text-xs px-2 py-1 rounded-full",
                        kw.direction === "up"
                          ? "text-rose-600 bg-rose-50 dark:bg-rose-950/40"
                          : kw.direction === "down"
                            ? "text-blue-600 bg-blue-50 dark:bg-blue-950/40"
                            : "text-gray-500 bg-gray-100 dark:bg-gray-800/40"
                      )}
                    >
                      {kw.direction === "up" ? (
                        <ArrowUpRight className="size-3" />
                      ) : kw.direction === "down" ? (
                        <ArrowDownRight className="size-3" />
                      ) : (
                        <Minus className="size-3" />
                      )}
                      {Math.abs(kw.changeRate)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// New Keywords Content — Fixed scroll with column limits
// ===========================================================================

function NewKeywordsContent() {
  const [days] = useState(7);
  const [expanded, setExpanded] = useState(false);
  const [selectedDay, setSelectedDay] = useState(-1); // -1 = auto-select first date with data

  const MAX_VISIBLE = 12;

  const { data, isLoading } = useQuery<{
    dates: Array<{
      date: string;
      label: string;
      dayOfWeek: string;
      keywords: Array<{ keyword: string; volume: number }>;
    }>;
    totalCount: number;
    source: "corpus" | "searches";
  }>({
    queryKey: ["new-keywords", days],
    queryFn: async () => {
      const res = await fetch(`/api/keywords/new?days=${days}`);
      if (!res.ok) throw new Error("Failed to fetch new keywords");
      return res.json();
    },
    staleTime: 0,
  });

  const dates = data?.dates ?? [];

  // Auto-select first date with data
  const activeDay = selectedDay >= 0
    ? selectedDay
    : dates.findIndex((d) => d.keywords.length > 0) >= 0
      ? dates.findIndex((d) => d.keywords.length > 0)
      : 0;

  const activeDate = dates[activeDay];
  const keywords = activeDate?.keywords ?? [];
  const maxVolume = Math.max(...keywords.map((k) => k.volume), 1);
  const visibleKws = expanded ? keywords : keywords.slice(0, MAX_VISIBLE);
  const hasMore = keywords.length > MAX_VISIBLE;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (dates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm">
        <Sparkles className="size-8 mb-2 opacity-30" />
        데이터 수집 대기중
      </div>
    );
  }

  function formatVolume(v: number): string {
    if (v >= 10000) return `${(v / 10000).toFixed(1)}만`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}천`;
    return v.toLocaleString();
  }

  return (
    <div className="space-y-4">
      {/* Top bar: day selector + count */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {dates.slice(0, 7).map((col, idx) => {
            const hasData = col.keywords.length > 0;
            return (
              <button
                key={col.date}
                type="button"
                onClick={() => { setSelectedDay(idx); setExpanded(false); }}
                className={cn(
                  "relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0",
                  activeDay === idx
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
              >
                {col.dayOfWeek} <span className="opacity-60">{col.date.slice(5)}</span>
                {hasData && activeDay !== idx && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
          {data?.totalCount ? `${data.totalCount.toLocaleString()}개` : ""}
          {data?.source === "searches" && " · 검색 기록"}
        </span>
      </div>

      {/* Keywords grid — card-style with volume bar */}
      {keywords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm">
          <Sparkles className="size-6 mb-2 opacity-20" />
          이 날짜에 새 키워드가 없습니다
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {visibleKws.map((kw, idx) => {
              const barPct = Math.max((kw.volume / maxVolume) * 100, 2);
              return (
                <button
                  key={kw.keyword}
                  type="button"
                  onClick={() =>
                    window.open(
                      `/analyze?keyword=${encodeURIComponent(kw.keyword)}`,
                      "_blank"
                    )
                  }
                  className="group flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/20 hover:bg-muted/40 dark:bg-white/5 dark:hover:bg-white/10 transition-all cursor-pointer text-left"
                >
                  {/* Rank number */}
                  <span className={cn(
                    "shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-extrabold",
                    idx < 3
                      ? "bg-primary/15 text-primary dark:bg-primary/25"
                      : "bg-muted/40 text-muted-foreground dark:bg-white/10"
                  )}>
                    {idx + 1}
                  </span>

                  {/* Keyword + volume bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                        {kw.keyword}
                      </span>
                      <span className="text-[11px] text-muted-foreground tabular-nums shrink-0 font-medium">
                        {kw.volume > 0 ? formatVolume(kw.volume) : "-"}
                      </span>
                    </div>
                    {/* Volume bar */}
                    <div className="h-1 rounded-full bg-muted/30 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary/30 transition-all duration-500"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* More / Collapse */}
          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="w-full py-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-1"
            >
              <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
              {expanded ? "접기" : `${keywords.length - MAX_VISIBLE}개 더보기`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ===========================================================================
// Seasonal Keywords Content — improved cards with heat indicator
// ===========================================================================

function SeasonalKeywordsContent() {
  const currentMonth = new Date().getMonth() + 1;

  const { data, isLoading } = useQuery<{
    month: number;
    label: string;
    keywords: Array<{
      keyword: string;
      avgVolume: number;
      multiplier: number;
      peakMonth: number;
      peakLabel: string;
    }>;
  }>({
    queryKey: ["seasonal-keywords", currentMonth],
    queryFn: async () => {
      const res = await fetch(`/api/keywords/seasonal?month=${currentMonth}`);
      if (!res.ok) throw new Error("Failed to fetch seasonal keywords");
      return res.json();
    },
    staleTime: 0,
  });

  const keywords = data?.keywords ?? [];

  // Compute max multiplier for heat bar normalization
  const maxMultiplier = Math.max(...keywords.map((k) => k.multiplier), 1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (keywords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm">
        <CalendarDays className="size-8 mb-2 opacity-30" />
        시즌 데이터를 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-muted-foreground">
          {data?.label ?? `${currentMonth}월`} 시즌
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {keywords.slice(0, 8).map((kw) => {
          const heatPct = Math.min((kw.multiplier / maxMultiplier) * 100, 100);
          const heatColor =
            kw.multiplier >= 2
              ? "from-rose-500 to-orange-400"
              : kw.multiplier >= 1.5
                ? "from-amber-500 to-yellow-400"
                : "from-emerald-500 to-teal-400";

          return (
            <button
              key={kw.keyword}
              type="button"
              onClick={() => window.open(`/analyze?keyword=${encodeURIComponent(kw.keyword)}`, '_blank')}
              className="bg-background border border-muted/40 rounded-xl p-4 text-left hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group"
            >
              {/* Heat indicator bar at top */}
              <div className="h-1.5 rounded-full bg-muted/20 mb-3 overflow-hidden">
                <div
                  className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", heatColor)}
                  style={{ width: `${heatPct}%` }}
                />
              </div>

              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-bold text-sm group-hover:text-primary transition-colors truncate">
                  {kw.keyword}
                </span>
                <span
                  className={cn(
                    "text-xs font-extrabold shrink-0 px-1.5 py-0.5 rounded",
                    kw.multiplier >= 2
                      ? "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/40"
                      : kw.multiplier >= 1.5
                        ? "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40"
                        : "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40"
                  )}
                >
                  x{kw.multiplier}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">평균 검색량</span>
                  <span className="font-semibold">
                    {kw.avgVolume > 0 ? kw.avgVolume.toLocaleString() : "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">집중 시기</span>
                  <span className="font-semibold">{kw.peakLabel}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
