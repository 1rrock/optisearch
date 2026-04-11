"use client";

import { Search, Bookmark, Verified, Minus, Plus, Download, Type, PenTool, BarChart2, TrendingUp } from "lucide-react";
import { PLAN_LIMITS, PLAN_PRICING, type PlanId } from "@/shared/config/constants";
import { useDashboardData } from "@/shared/hooks/use-user";
import { exportToExcel } from "@/shared/lib/excel";
import { toast } from "sonner";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RankTrackerForm } from "@/features/trend/ui/RankTrackerForm";
import { RankHistoryChart } from "@/features/trend/ui/RankHistoryChart";
import { RankTargetList } from "@/features/trend/ui/RankTargetList";
import { useRankTrackTargets } from "@/features/trend/api/use-rank";


function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted/50 ${className ?? ""}`} />;
}

function planLabel(plan: PlanId): string {
  return PLAN_PRICING[plan]?.label ?? plan;
}

function StatItem({ label, used, limit, color, initialized, icon }: { label: string; used: number; limit: number; color: string; initialized: boolean; icon?: React.ReactNode }) {
  const isAtLimit = limit !== -1 && limit !== 0 && used >= limit;
  const pct = limit <= 0 ? 0 : Math.min(used / limit, 1);
  return (
    <div className="flex items-center gap-4 py-3 sm:py-4 px-3 sm:px-4 rounded-xl hover:bg-muted/30 transition-colors border border-transparent hover:border-muted/50 group">
      <div className="shrink-0 p-2.5 rounded-lg transition-transform group-hover:scale-110" style={{ backgroundColor: `${color}15`, color }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-foreground">{label}</span>
          {initialized ? (
            <div className="flex items-baseline gap-1 lg:gap-1.5 shrink-0 ml-3">
              <span className={`text-lg sm:text-xl font-black leading-none tracking-tight ${isAtLimit ? "text-rose-500" : "text-foreground"}`}>{used}</span>
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">/ {limit === -1 ? "∞" : limit === 0 ? "—" : limit}</span>
            </div>
          ) : (
             <SkeletonBlock className="h-5 w-16" />
          )}
        </div>
        {initialized ? (
          <div className="h-1.5 w-full bg-muted overflow-hidden rounded-full">
            <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: limit <= 0 ? '0%' : `${pct * 100}%`, backgroundColor: isAtLimit ? "#f43f5e" : color }} />
          </div>
        ) : (
          <SkeletonBlock className="h-1.5 w-full rounded-full" />
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [query, setQuery] = useState("");
  const [trackedTargetId, setTrackedTargetId] = useState<string | undefined>();
  const router = useRouter();
  const { plan, usage, recentSearches, savedKeywordsCount, initialized } = useDashboardData();
  const effectivePlan = plan;
  const limits = PLAN_LIMITS[effectivePlan];
  const searchLimit = limits.dailySearch;
  const titleLimit = limits.dailyTitle;
  const draftLimit = limits.dailyDraft;
  const scoreLimit = limits.dailyScore;
  const { data: rankData, isPending: rankLoading } = useRankTrackTargets();
  const trackLimit = limits.maxTrackTargets;
  const trackUsed = rankData?.targets?.length ?? 0;

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
    } catch (err) {
      console.error("[dashboard] Export failed:", err);
      toast.error("검색 기록 내보내기에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-8">

      {/* 1. Top Section: Gorgeous Dashboard Header */}
      <div className="relative overflow-hidden rounded-[2rem] bg-card border border-muted/50 p-6 sm:p-8 lg:p-10 shadow-sm">
        <div className="absolute top-[-50%] right-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-sm">
              <Verified className="size-4" />
              <span className="text-sm font-bold tracking-tight">
                현재 {initialized ? planLabel(effectivePlan) : <SkeletonBlock className="h-4 w-12 inline-block ml-1" />} 플랜 이용 중
              </span>
            </div>
            <div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-2 text-foreground">
                 오늘의 데이터 리포트
              </h2>
              <p className="text-muted-foreground font-medium">실시간 사용량 현황입니다. 제공량은 매일 자정(KST)에 초기화됩니다.</p>
            </div>
          </div>
          
          <div className="shrink-0 flex items-center gap-4 bg-background/80 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-muted/50 p-5 px-6 self-start lg:self-end">
             <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Bookmark className="size-6" />
             </div>
             <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">저장된 키워드</p>
                {initialized ? (
                  <p className="text-2xl font-black leading-none">{savedKeywordsCount}<span className="text-lg font-medium text-muted-foreground ml-1">개</span></p>
                ) : (
                  <SkeletonBlock className="h-6 w-12" />
                )}
             </div>
          </div>
        </div>
        
        <div className="relative z-10 bg-background/80 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-muted/50 p-2 lg:p-4 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-0.5">
            <StatItem label="오늘 검색" used={usage.search} limit={searchLimit} color="hsl(var(--primary))" initialized={initialized} icon={<Search className="size-5" />} />
            <StatItem label="AI 제목 추천" used={usage.title} limit={titleLimit} color="#f59e0b" initialized={initialized} icon={<Type className="size-5" />} />
            <StatItem label="AI 초안 생성" used={usage.draft} limit={draftLimit} color="#10b981" initialized={initialized} icon={<PenTool className="size-5" />} />
            <StatItem label="AI 점수 분석" used={usage.score} limit={scoreLimit} color="#8b5cf6" initialized={initialized} icon={<BarChart2 className="size-5" />} />
            <StatItem label="순위 추적 슬롯" used={trackUsed} limit={trackLimit} color="#06b6d4" initialized={initialized && !rankLoading} icon={<TrendingUp className="size-5" />} />
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
          <div className="flex flex-col sm:flex-row gap-3 p-2 sm:bg-muted/30 sm:rounded-2xl sm:border-2 sm:border-transparent focus-within:border-primary/20 focus-within:bg-card transition-all">
            <input
              className="w-full sm:flex-1 bg-muted/30 sm:bg-transparent border-2 border-transparent sm:border-none rounded-2xl sm:rounded-none outline-none ring-0 px-4 py-4 sm:py-0 text-lg font-medium placeholder:text-muted-foreground"
              placeholder="키워드를 입력하세요..."
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <button
              onClick={handleSearch}
              className="w-full sm:w-auto bg-primary text-primary-foreground px-5 sm:px-8 py-4 sm:py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all shrink-0"
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
                  href={`/analyze?keyword=${encodeURIComponent(s.keyword)}`}
                  className="px-4 py-1.5 bg-muted/60 hover:bg-muted text-foreground text-sm rounded-full transition-colors font-medium border border-transparent"
                >
                  {s.keyword}
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 2.5 Middle Section: Rank Tracking */}
      <section className="bg-gradient-to-br from-card to-muted/10 p-5 sm:p-8 rounded-3xl shadow-sm border border-muted/50 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-muted/30 pb-5 relative z-10">
          <div>
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2 text-foreground">
              <span className="text-primary text-3xl">📈</span> 내 상품 순위 추적
            </h2>
            <p className="text-muted-foreground text-sm mt-2">
              스마트스토어 URL과 키워드를 등록하면 매일 네이버 쇼핑 순위 변동을 자동으로 추적하여 보여드립니다.
            </p>
          </div>
          <div className="shrink-0 bg-primary/5 px-4 py-2 rounded-xl border border-primary/10 flex items-center gap-2 self-start md:self-auto">
             <div className="size-2.5 rounded-full bg-primary animate-pulse" />
             <span className="text-sm font-bold text-primary">순위 자동 추적 활성화됨</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 relative z-10 items-stretch">
          <div className="xl:col-span-4 space-y-6">
             <div className="bg-background/80 backdrop-blur-md rounded-2xl p-6 border border-muted/50 shadow-sm transition-all hover:border-primary/20 hover:shadow-md">
                <h3 className="text-sm font-bold text-foreground mb-4">새 상품 등록</h3>
                <RankTrackerForm onTracked={(target) => setTrackedTargetId(target.id)} />
             </div>
             
             <div className="bg-background/80 backdrop-blur-md rounded-2xl border border-muted/50 shadow-sm overflow-hidden transition-all hover:border-primary/20 hover:shadow-md">
                <div className="p-5 border-b border-muted/30 bg-muted/5 flex items-center justify-between">
                   <h3 className="text-sm font-bold text-foreground">추적 중인 상품</h3>
                   {initialized && !rankLoading && (
                     <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold">{trackUsed} / {trackLimit}</span>
                   )}
                </div>
                <div className="h-[320px] overflow-y-auto p-0 custom-scrollbar">
                   <RankTargetList selectedId={trackedTargetId} onSelect={setTrackedTargetId} />
                </div>
             </div>
          </div>
          
          <div className="xl:col-span-8 bg-background/80 backdrop-blur-md rounded-2xl border border-muted/50 shadow-sm p-5 sm:p-6 overflow-hidden transition-all hover:border-primary/20 hover:shadow-md min-h-[500px] flex flex-col">
            {trackedTargetId ? (
              <>
                <div className="mb-6 flex items-center justify-between pl-2 pb-4 border-b border-muted/20">
                   <h3 className="text-lg font-bold tracking-tight">순위 변동 추이 차트</h3>
                </div>
                <div className="w-full overflow-x-auto flex-1 custom-scrollbar">
                   <div className="min-w-[600px] h-full flex flex-col">
                     <RankHistoryChart targetId={trackedTargetId} />
                   </div>
                </div>
              </>
            ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center min-h-[400px]">
                 <div className="p-6 bg-muted/20 rounded-full mb-6 ring-8 ring-muted/10 shadow-inner">
                    <TrendingUp className="size-10 opacity-30 text-primary" />
                 </div>
                 <p className="font-bold text-foreground/80 text-xl tracking-tight mb-2">어떤 상품의 순위를 추적할까요?</p>
                 <p className="text-sm mt-1 max-w-sm font-medium opacity-80">좌측 패널에서 새로운 상품을 등록하거나, <br className="sm:hidden" />목록에 있는 상품을 선택하여 순위 변동을 확인해보세요.</p>
               </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. Bottom Section: Full Width */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Recent Searches List */}
        <section className="lg:col-span-12 bg-card rounded-xl shadow-sm overflow-hidden border border-muted/50">
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
