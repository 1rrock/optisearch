"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
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
  Edit3,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";
import type { TrendingWordCloudItem } from "@/features/trends/ui/TrendingWordCloud";
import { AiLinkButton } from "@/shared/components/AiLinkButton";

const TrendingWordCloud = dynamic(
  () => import("@/features/trends/ui/TrendingWordCloud").then((mod) => mod.TrendingWordCloud),
  { ssr: false }
);

// ---------------------------------------------------------------------------
// Main Page — Sections: Trending → News Cards → New Keywords → Seasonal
// ---------------------------------------------------------------------------

export default function TrendsPage() {
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

  // Shared trending data fetch — both sections use this same sorted list
  const { data: trendingData, isLoading: isTrendingLoading } = useQuery<{
    keywords: TrendingWordCloudItem[];
    lastUpdated?: string;
  }>({
    queryKey: ["trending-keywords", "daily"],
    queryFn: async () => {
      const res = await fetch("/api/keywords/trending?period=daily");
      if (!res.ok) throw new Error("Failed to fetch trending keywords");
      return res.json();
    },
    refetchInterval: 15 * 60 * 1000,
  });

  // Default sort: by |changeRate| desc — same as TrendingSectionWrapper default
  const sortedKeywords = [...(trendingData?.keywords ?? [])].sort(
    (a, b) => Math.abs(b.changeRate) - Math.abs(a.changeRate)
  );
  const top10 = sortedKeywords.slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<TrendingUp className="size-8 text-primary" />}
        title="키워드 트렌드"
        description="실시간 인기 키워드 · 뉴스 · 새 키워드 · 시즌 키워드"
      />

      <TrendingSectionWrapper
        sharedKeywords={sortedKeywords}
        isSharedLoading={isTrendingLoading}
        lastUpdated={trendingData?.lastUpdated}
        onSelectKeyword={(kw) => {
          setSelectedKeyword(kw);
          document.getElementById("trending-news-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        selectedKeyword={selectedKeyword}
      />

      <div id="trending-news-section">
        <TrendsNewsListSection
          top10={top10}
          isLoading={isTrendingLoading}
          selectedKeyword={selectedKeyword}
          onSelectKeyword={setSelectedKeyword}
        />
      </div>

      {/* <NewKeywordsSection /> */}
      <SeasonalKeywordsSection />
    </div>
  );
}

// ===========================================================================
// Trends News List Section — matched to "Keyword Master" reference
// ===========================================================================

type NewsItem = {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
};

interface TrendsNewsListSectionProps {
  top10: TrendingWordCloudItem[];
  isLoading: boolean;
  selectedKeyword: string | null;
  onSelectKeyword: (kw: string) => void;
}

function TrendsNewsListSection({ top10, isLoading: isTrendingLoading, selectedKeyword, onSelectKeyword }: TrendsNewsListSectionProps) {
  // Active keyword: use selected or default to first in the shared sorted list
  const activeKeyword = selectedKeyword || top10[0]?.keyword;

  // 2. Fetch Multiple News Items for the selected keyword
  const { data: newsData, isLoading: isNewsLoading } = useQuery<{
    items: NewsItem[];
    total: number;
  }>({
    queryKey: ["keyword-news-list", activeKeyword],
    queryFn: async () => {
      if (!activeKeyword) return { items: [], total: 0 };
      const res = await fetch(`/api/keywords/news?keyword=${encodeURIComponent(activeKeyword)}`);
      if (!res.ok) throw new Error("Failed to fetch news");
      return res.json();
    },
    enabled: !!activeKeyword,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  if (isTrendingLoading && top10.length === 0) {
    return (
      <div className="bg-card border border-muted/50 rounded-2xl p-6 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 mb-5">
          <Skeleton className="size-5 rounded-md" />
          <Skeleton className="h-6 w-24 rounded-md" />
        </div>
        <div className="space-y-4">
          <div className="flex gap-2 overflow-hidden border-b border-muted/30 pb-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-10 w-24 shrink-0 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (top10.length === 0) return null;

  function formatDate(dateStr: string) {
    try {
      const date = new Date(dateStr);
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${month}-${day} ${hours}:${minutes}`;
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="bg-card border border-muted/50 rounded-2xl overflow-hidden shadow-sm">
      {/* 1. Keyword Tabs (Numbered) */}
      <div className="flex overflow-x-auto bg-muted/20 border-b border-muted/30 scrollbar-hide">
        {top10.map((item, idx) => {
          const isSelected = activeKeyword === item.keyword;
          return (
            <button
              key={item.keyword}
              onClick={() => onSelectKeyword(item.keyword)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-bold whitespace-nowrap transition-all border-b-2",
                isSelected
                  ? "bg-white dark:bg-white/5 border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/10"
              )}
            >
              <span className={cn(
                "flex items-center justify-center size-5 rounded text-[10px] font-extrabold",
                isSelected ? "bg-primary text-white" : "bg-muted-foreground/20 text-muted-foreground"
              )}>
                {idx + 1}
              </span>
              {item.keyword}
            </button>
          );
        })}
      </div>

      {/* 2. News Title Section */}
      <div className="px-6 pt-5 pb-2 flex items-center justify-between gap-4">
        <h4 className="text-lg font-bold text-foreground">
          <span className="text-primary">'{activeKeyword}'</span>에 대한 뉴스
        </h4>
        {activeKeyword && (
          <AiLinkButton
            href={`/ai?keyword=${encodeURIComponent(activeKeyword)}&tab=draft${newsData?.items?.[0]?.title ? `&hint=${encodeURIComponent(newsData.items[0].title.replace(/<[^>]+>/g, '').slice(0, 100))}` : ""}`}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors text-xs font-bold shrink-0 border border-emerald-500/20"
            feature="AI 글 초안"
          >
            <Edit3 className="size-3.5" />
            AI 초안 쓰기
          </AiLinkButton>
        )}
      </div>

      {/* 3. News List Section */}
      <div className="px-6 pb-4">
        {isNewsLoading ? (
          <div className="space-y-6 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        ) : (newsData?.items ?? []).length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            관련 뉴스를 찾을 수 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-muted/30">
            {newsData?.items.map((news, idx) => (
              <a
                key={idx}
                href={news.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group block py-4 first:pt-2 last:pb-2 hover:bg-muted/30 -mx-6 px-6 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-1">
                  <h5
                    className="text-[15px] font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-1"
                    dangerouslySetInnerHTML={{ __html: news.title }}
                  />
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap tabular-nums mt-1 font-medium">
                    {formatDate(news.pubDate)}
                  </span>
                </div>
                <p 
                  className="text-xs text-muted-foreground leading-relaxed line-clamp-2"
                  dangerouslySetInnerHTML={{ __html: news.description }}
                />
              </a>
            ))}
          </div>
        )}
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

interface TrendingSectionWrapperProps {
  sharedKeywords: TrendingKw[];
  isSharedLoading: boolean;
  lastUpdated?: string;
  onSelectKeyword: (kw: string) => void;
  selectedKeyword: string | null;
}

function TrendingSectionWrapper({ sharedKeywords, isSharedLoading, lastUpdated, onSelectKeyword, selectedKeyword }: TrendingSectionWrapperProps) {
  // period/monthly toggle still fetches separately for monthly view
  const [period, setPeriod] = useState<"daily" | "monthly">("daily");
  const [sort, setSort] = useState<TrendingSort>("changeRate");
  const [order, setOrder] = useState<TrendingOrder>("desc");
  const [view, setView] = useState<TrendingView>("cloud");

  const { data: monthlyData, isLoading: isMonthlyLoading, isError: isMonthlyError } = useQuery<{ period: string; keywords: TrendingKw[]; lastUpdated?: string }>({
    queryKey: ["trending-keywords", "monthly"],
    queryFn: async () => {
      const res = await fetch("/api/keywords/trending?period=monthly");
      if (!res.ok) throw new Error("Failed to fetch trending keywords");
      return res.json();
    },
    enabled: period === "monthly",
    refetchInterval: 15 * 60 * 1000,
  });

  const isLoading = period === "daily" ? isSharedLoading : isMonthlyLoading;
  const isError = period === "monthly" && isMonthlyError;
  const rawKeywords = period === "daily" ? sharedKeywords : (monthlyData?.keywords ?? []);

  // Sort — default changeRate desc matches the shared sort already for daily,
  // but user can override by clicking column headers
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
          {(lastUpdated ?? monthlyData?.lastUpdated) && (
            <span className="text-xs text-muted-foreground">
              마지막 업데이트: {new Date(((period === "daily" ? lastUpdated : monthlyData?.lastUpdated) ?? "") + "T00:00:00+09:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
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
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-2/3 aspect-video bg-white/40 dark:bg-white/5 rounded-xl border border-muted/20 flex items-center justify-center relative overflow-hidden">
             {/* Word Cloud Skeleton: A central blob and some smaller ones */}
             <Skeleton className="size-48 rounded-full opacity-60" />
             <Skeleton className="size-24 rounded-full absolute top-1/4 left-1/4 opacity-40" />
             <Skeleton className="size-32 rounded-full absolute bottom-1/4 right-1/4 opacity-40" />
             <Skeleton className="size-20 rounded-full absolute top-1/3 right-1/3 opacity-30" />
          </div>
          <div className="lg:w-1/3 space-y-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-6 rounded-full shrink-0" />
                <Skeleton className="h-8 flex-1 rounded-lg" />
              </div>
            ))}
          </div>
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
                onClick={() => onSelectKeyword(kw.keyword)}
                className={cn(
                  "flex items-center gap-3 py-2.5 px-2 rounded-lg transition-colors cursor-pointer text-left w-full",
                  selectedKeyword === kw.keyword 
                    ? "bg-orange-500/10 dark:bg-orange-500/20 ring-1 ring-orange-500/30" 
                    : "hover:bg-white/60 dark:hover:bg-white/10"
                )}
              >
                <span className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0",
                  idx < 3 ? "bg-orange-500 text-white" : "bg-muted/50 text-muted-foreground"
                )}>
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold truncate block">{kw.keyword}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* AI Draft button */}
                  <AiLinkButton
                    href={`/ai?keyword=${encodeURIComponent(kw.keyword)}&tab=draft`}
                    className="opacity-0 group-hover:opacity-100 transition-opacity size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                    title="AI 초안 작성"
                    feature="AI 글 초안"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Edit3 className="size-3.5" />
                  </AiLinkButton>
                  <div className="flex flex-col items-end">
                    <span className={cn(
                      "text-xs font-bold",
                      kw.direction === "up" ? "text-rose-500" : kw.direction === "down" ? "text-blue-500" : "text-muted-foreground"
                    )}>
                      {kw.direction === "up" ? <ArrowUpRight className="size-3 inline" /> : kw.direction === "down" ? <ArrowDownRight className="size-3 inline" /> : null}
                      {Math.abs(kw.changeRate)}%
                    </span>
                    {kw.commercialScore && kw.commercialScore >= 40 && (
                      <span className={cn(
                        "text-[9px] font-bold px-1 py-0.5 rounded mt-0.5",
                        kw.commercialScore >= 70 
                          ? "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400" 
                          : "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                      )}>
                        {kw.commercialScore >= 70 ? "광고가치 높음" : "광고가치 보통"}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {kw.volume > 0 ? `${(kw.volume / 10000).toFixed(1)}만` : ""}
                    </span>
                  </div>
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
                <th className="text-right py-2.5 pr-4 font-semibold w-20">AI 초안</th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((kw, idx) => (
                <tr
                  key={kw.keyword}
                  className={cn(
                    "border-b border-muted/15 transition-colors cursor-pointer",
                    selectedKeyword === kw.keyword ? "bg-orange-500/5 dark:bg-orange-500/10" : "hover:bg-white/60 dark:hover:bg-white/10"
                  )}
                  onClick={() => onSelectKeyword(kw.keyword)}
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
                    {kw.commercialScore && kw.commercialScore >= 40 && (
                      <div className={cn(
                        "mt-1 inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded",
                        kw.commercialScore >= 70 
                          ? "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400" 
                          : "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                      )} title={`상업적 가치 점수: ${kw.commercialScore}`}>
                        {kw.commercialScore >= 70 ? "광고가치 높음" : "광고가치 보통"}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <AiLinkButton
                      href={`/ai?keyword=${encodeURIComponent(kw.keyword)}&tab=draft`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors text-[11px] font-bold border border-emerald-500/20"
                      title="AI 초안 작성"
                      feature="AI 글 초안"
                    >
                      <Edit3 className="size-3" />
                      초안
                    </AiLinkButton>
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

  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2 overflow-hidden">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-8 w-16 rounded-lg shrink-0" />
            ))}
          </div>
          <Skeleton className="h-4 w-12 shrink-0" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <Skeleton key={i} className="h-[68px] w-full rounded-xl" />
          ))}
        </div>
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

  if (isLoading && !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
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
