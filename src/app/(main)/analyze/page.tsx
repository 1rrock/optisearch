"use client";

import { useState, useEffect, useRef, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useProfitMutation,
  type ProfitCompetitionLevel,
} from "@/features/keyword-analysis/api/use-profit";
import { ProfitScoreCard } from "@/features/keyword-analysis/ui/ProfitScoreCard";
import { useUserStore } from "@/shared/stores/user-store";
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
  Lock,
  ChevronUp,
  ChevronDown,
  Download,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { getKeywordGradeConfig, CHART_COLORS } from "@/shared/config/constants";
import type { KeywordSearchResult, RelatedKeyword } from "@/entities/keyword/model/types";
import type { TrendPoint, SeasonalityInfo } from "@/services/trend-service";
import { copyToClipboard, formatKeywordsAsHashtags, formatKeywordsAsTags } from "@/shared/lib/clipboard";
import { UpgradeModal } from "@/shared/components/UpgradeModal";
import { SearchInputWithHistory } from "@/shared/components/SearchInputWithHistory";
import { competitionBadgeClass } from "@/shared/lib/keyword-utils";

// ---------------------------------------------------------------------------
// API types
// ---------------------------------------------------------------------------

interface QuickResponse {
  keyword: string;
  correctedKeyword: string | null;
  pcSearchVolume: number;
  mobileSearchVolume: number;
  totalSearchVolume: number;
  competition: string;
  clickRate: number;
  estimatedClicks?: number;
  isEstimated?: boolean;
  plan: "free" | "basic" | "pro";
}

interface FullResponse {
  analysis: KeywordSearchResult;
  correctedKeyword: string | null;
  plan: "free" | "basic" | "pro";
}

interface ExtraResponse {
  relatedKeywords: RelatedKeyword[];
  news: { items: Array<{ title: string; link: string; description: string }>; total: number } | null;
  webDocuments: { items: Array<{ title: string; link: string; description: string }>; total: number } | null;
  encyclopediaWall: boolean;
  encyclopediaCount: number;
  contentSpec?: { avgTitleLength: number; avgDescLength: number; count: number } | null;
  intent?: { intent: string; confidence: number; reason: string } | null;
  strategy?: { verdict: string; reason: string; tips: string[] } | null;
  clusters?: Array<{ label: string; keywords: string[] }> | null;
}

interface DemographicsResponse {
  keyword: string;
  gender: Array<{ group: string; ratio: number }>;
  device: Array<{ group: string; ratio: number }>;
  age: Array<{ group: string; ratio: number }>;
}

// Legacy type kept for compare page cache compatibility
interface AnalyzeResponse {
  analysis: KeywordSearchResult;
  relatedKeywords: RelatedKeyword[];
  correctedKeyword: string | null;
  plan?: "free" | "basic" | "pro";
}

// ---------------------------------------------------------------------------
// Inline fetch functions
// ---------------------------------------------------------------------------

import { UsageLimitError, parseUsageLimitError } from "@/shared/lib/errors";
import { TurnstileWidget, type TurnstileRef } from "@/shared/components/TurnstileWidget";

async function fetchQuick(keyword: string, turnstileToken?: string): Promise<QuickResponse> {
  const res = await fetch("/api/analyze/quick", {
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

async function fetchFull(keyword: string): Promise<FullResponse> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `분석 실패 (${res.status})`);
  }
  return res.json();
}

async function fetchExtra(keyword: string, analysisContext?: {
  totalSearchVolume?: number;
  competition?: string;
  saturationLabel?: string;
  saturationScore?: number;
  clickRate?: number;
}): Promise<ExtraResponse> {
  const res = await fetch("/api/analyze/extra", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword, analysisContext }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
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

function toProfitCompetitionLevel(competition: string): ProfitCompetitionLevel {
  if (competition === "낮음") return "LOW";
  if (competition === "높음") return "HIGH";
  return "MEDIUM";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// TrendSeries type
// ---------------------------------------------------------------------------

interface TrendSeries {
  label: string;
  data: TrendPoint[];
  color: string;
}

const SPIKE_THRESHOLD = 0.5; // 50% change marks a spike

function catmullRomToBezier(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

const COMPETITION_ORDER: Record<string, number> = { "낮음": 0, "보통": 1, "높음": 2 };

function KeywordTrendChart({
  series,
  error,
  loading,
  totalVolume,
  showMarkers,
  showForecast,
  plan,
}: {
  series: TrendSeries[];
  error: boolean;
  loading: boolean;
  totalVolume?: number;
  showMarkers?: boolean;
  showForecast?: boolean;
  plan?: "free" | "basic" | "pro";
}) {
  const [tooltip, setTooltip] = useState<{ x: number; period: string; values: { label: string; value: string; color: string }[] } | null>(null);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        트렌드 데이터를 불러올 수 없습니다
      </div>
    );
  }

  if (loading || series.length === 0) {
    return (
      <div className="h-64 bg-muted/30 rounded-lg animate-pulse" />
    );
  }

  const primarySorted = [...series[0].data].sort((a, b) => a.period.localeCompare(b.period));

  if (primarySorted.length < 2) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        트렌드 데이터가 없습니다
      </div>
    );
  }

  const isSingle = series.length === 1;

  const W = 700;
  const H = 260;
  const PAD = { top: 20, right: 24, bottom: 44, left: 70 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const periods = primarySorted.map((d) => d.period);
  const xStep = chartW / Math.max(periods.length - 1, 1);

  const allRatios = series.flatMap((s) => s.data.map((d) => d.ratio));
  const maxRatio = Math.max(...allRatios, 1);

  const useVolume = !!totalVolume;
  const ratioToVol = (r: number) => useVolume ? Math.round((r / maxRatio) * totalVolume) : r;
  const maxValue = useVolume ? Math.ceil(ratioToVol(maxRatio) * 1.15) : Math.ceil(maxRatio * 1.15);
  const niceStep = useVolume
    ? (maxValue > 100000 ? 50000 : maxValue > 10000 ? 10000 : maxValue > 1000 ? 1000 : 100)
    : 25;
  const niceMax = Math.ceil(maxValue / niceStep) * niceStep || 100;
  const yTickCount = 4;
  const yTickValues = Array.from({ length: yTickCount + 1 }, (_, i) => Math.round((niceMax / yTickCount) * i));

  const xOf = (i: number) => PAD.left + i * xStep;
  const yOf = (ratio: number) => {
    const val = ratioToVol(ratio);
    return PAD.top + chartH - (val / niceMax) * chartH;
  };
  const formatYLabel = (v: number): string => {
    if (v >= 10000) return `${Math.round(v / 10000)}만`;
    if (v >= 1000) return `${(v / 1000).toFixed(0)}천`;
    return v.toLocaleString("ko-KR");
  };
  const volumeLabel = (ratio: number): string => {
    const vol = ratioToVol(ratio);
    return vol.toLocaleString("ko-KR");
  };

  const tickStep = Math.max(1, Math.floor(periods.length / 6));
  const xTicks = primarySorted.filter((_, i) => i % tickStep === 0);

  const seriesRenderData = series.map((s) => {
    const sortedData = [...s.data].sort((a, b) => a.period.localeCompare(b.period));
    const periodMap = new Map<string, TrendPoint>(sortedData.map((d) => [d.period, d]));
    const pts = periods.map((period, i) => {
      const pt = periodMap.get(period);
      const ratio = pt ? pt.ratio : 0;
      return { x: xOf(i), y: yOf(ratio), ratio, period };
    });
    const volumeLookup = new Map<string, number>(pts.map((p) => [p.period, ratioToVol(p.ratio)]));
    const linePath = catmullRomToBezier(pts.map((p) => ({ x: p.x, y: p.y })));
    const areaPath = isSingle
      ? linePath + ` L ${xOf(periods.length - 1)} ${PAD.top + chartH} L ${xOf(0)} ${PAD.top + chartH} Z`
      : "";
    return { pts, linePath, areaPath, volumeLookup };
  });

  // Linear regression from last 6 points of primary series, extended 3 periods forward
  let forecastPath = "";
  if (showForecast && plan === "pro" && primarySorted.length >= 6) {
    const last6 = primarySorted.slice(-6);
    const n = last6.length;
    const xs = last6.map((_, i) => i);
    const ys = last6.map((d) => d.ratio);
    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
    const sumX2 = xs.reduce((a, x) => a + x * x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const baseIdx = periods.length - 1;
    const forecastPts = [
      { x: xOf(baseIdx), y: yOf(intercept + slope * (n - 1)) },
      { x: xOf(baseIdx + 1), y: yOf(intercept + slope * n) },
      { x: xOf(baseIdx + 2), y: yOf(intercept + slope * (n + 1)) },
      { x: xOf(baseIdx + 3), y: yOf(intercept + slope * (n + 2)) },
    ];
    forecastPath = catmullRomToBezier(forecastPts);
  }

  const primaryColor = series[0].color;
  const dateRange = primarySorted.length >= 2
    ? `${primarySorted[0].period.slice(0, 7)} ~ ${primarySorted[primarySorted.length - 1].period.slice(0, 7)}`
    : null;

  // Build tooltip y position (use primary series)
  const tooltipY = tooltip
    ? (() => {
        const idx = periods.indexOf(tooltip.period);
        if (idx < 0) return PAD.top;
        const pt = seriesRenderData[0]?.pts[idx];
        return pt ? pt.y : PAD.top;
      })()
    : 0;
  const tooltipX = tooltip
    ? (() => {
        const idx = periods.indexOf(tooltip.period);
        return idx >= 0 ? xOf(idx) : 0;
      })()
    : 0;

  return (
    <div className="w-full">
      {dateRange && (
        <p className="text-[11px] text-muted-foreground mb-2 text-right">{dateRange}</p>
      )}
      {/* Legend for multi-series */}
      {!isSingle && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs">
          {series.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5">
              <span className="inline-block w-5 h-0.5 rounded" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[320px]"
          style={{ height: H }}
          aria-label="검색량 트렌드 차트"
          onMouseLeave={() => setTooltip(null)}
        >
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primaryColor} stopOpacity={0.22} />
              <stop offset="80%" stopColor={primaryColor} stopOpacity={0.04} />
              <stop offset="100%" stopColor={primaryColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          {yTickValues.map((v) => {
            const py = PAD.top + chartH - (v / niceMax) * chartH;
            return (
              <line
                key={v}
                x1={PAD.left}
                x2={W - PAD.right}
                y1={py}
                y2={py}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeWidth={1}
              />
            );
          })}

          {yTickValues.map((v) => {
            const py = PAD.top + chartH - (v / niceMax) * chartH;
            return (
              <text
                key={v}
                x={PAD.left - 8}
                y={py + 4}
                textAnchor="end"
                fontSize={10}
                fill="currentColor"
                fillOpacity={0.5}
              >
                {formatYLabel(v)}
              </text>
            );
          })}

          {xTicks.map((pt) => {
            const idx = periods.indexOf(pt.period);
            return (
              <text
                key={pt.period}
                x={xOf(idx)}
                y={H - 10}
                textAnchor="middle"
                fontSize={10}
                fill="currentColor"
                fillOpacity={0.45}
              >
                {pt.period.slice(0, 7)}
              </text>
            );
          })}

          {/* Series paths */}
          {seriesRenderData.map((rd, si) => (
            <g key={series[si].label}>
              {isSingle && rd.areaPath && (
                <path d={rd.areaPath} fill="url(#trendGradient)" />
              )}
              <path
                d={rd.linePath}
                fill="none"
                stroke={series[si].color}
                strokeWidth={isSingle ? 2.5 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Dots for primary series only */}
              {si === 0 && rd.pts.map((pt) => (
                <circle
                  key={pt.period}
                  cx={pt.x}
                  cy={pt.y}
                  r={tooltip && tooltip.period === pt.period ? 5 : 3}
                  fill={series[si].color}
                  style={{ transition: "r 0.1s" }}
                />
              ))}
              {/* Markers for 급등/급락 (primary series only) */}
              {showMarkers && si === 0 && rd.pts.map((pt, pi) => {
                if (pi === 0) return null;
                const prev = rd.pts[pi - 1];
                if (prev.ratio === 0) return null;
                const change = (pt.ratio - prev.ratio) / prev.ratio;
                if (Math.abs(change) < SPIKE_THRESHOLD) return null;
                const isUp = change > 0;
                const mx = pt.x;
                const my = isUp ? pt.y - 14 : pt.y + 14;
                return (
                  <text
                    key={`marker-${pt.period}`}
                    x={mx}
                    y={my}
                    textAnchor="middle"
                    fontSize={10}
                    fill={isUp ? "#ef4444" : "#3b82f6"}
                  >
                    {isUp ? "▲" : "▼"}
                  </text>
                );
              })}
            </g>
          ))}

          {/* Forecast dashed line */}
          {forecastPath && (
            <path
              d={forecastPath}
              fill="none"
              stroke={primaryColor}
              strokeWidth={1.5}
              strokeDasharray="5 3"
              strokeOpacity={0.5}
              strokeLinecap="round"
            />
          )}

          {/* Invisible hover rects for tooltip */}
          {periods.map((period, i) => (
            <rect
              key={`hover-${period}`}
              x={xOf(i) - xStep / 2}
              y={PAD.top}
              width={xStep}
              height={chartH}
              fill="transparent"
              onMouseEnter={() => {
                const vals = seriesRenderData.map((rd, si) => {
                  const vol = rd.volumeLookup.get(period);
                  const value = vol !== undefined ? vol.toLocaleString("ko-KR") : "-";
                  return { label: series[si].label, value, color: series[si].color };
                });
                setTooltip({ x: xOf(i), period, values: vals });
              }}
            />
          ))}

          {/* Tooltip */}
          {tooltip && (() => {
            const tooltipHeight = 18 + series.length * 16 + 8;
            const tooltipWidth = 130;
            const tx = Math.min(tooltipX + 8, W - tooltipWidth - 4);
            const ty = Math.max(PAD.top, tooltipY - tooltipHeight / 2);
            return (
              <g>
                <line
                  x1={tooltipX}
                  x2={tooltipX}
                  y1={PAD.top}
                  y2={PAD.top + chartH}
                  stroke={primaryColor}
                  strokeOpacity={0.3}
                  strokeWidth={1}
                  strokeDasharray="4 2"
                />
                <rect
                  x={tx}
                  y={ty}
                  width={tooltipWidth}
                  height={tooltipHeight}
                  rx={6}
                  fill="#1e293b"
                  fillOpacity={0.92}
                />
                <text
                  x={tx + tooltipWidth / 2}
                  y={ty + 14}
                  textAnchor="middle"
                  fontSize={10}
                  fill="white"
                  fillOpacity={0.7}
                >
                  {tooltip.period.slice(0, 7)}
                </text>
                {tooltip.values.map((v, vi) => (
                  <g key={v.label}>
                    <circle cx={tx + 10} cy={ty + 24 + vi * 16} r={3} fill={v.color} />
                    <text
                      x={tx + 18}
                      y={ty + 28 + vi * 16}
                      fontSize={10}
                      fill="white"
                    >
                      {v.label}: {v.value}
                    </text>
                  </g>
                ))}
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Demographic filter definitions
// ---------------------------------------------------------------------------

const DEMO_FILTERS = [
  { key: "all", label: "전체", color: "#3b82f6", gender: undefined as undefined, ages: undefined as undefined },
  { key: "m10", label: "10대 남성", color: "#ef4444", gender: "m" as const, ages: ["1", "2"] },
  { key: "m20", label: "20대 남성", color: "#f59e0b", gender: "m" as const, ages: ["3", "4"] },
  { key: "m30", label: "30대 남성", color: "#10b981", gender: "m" as const, ages: ["5", "6"] },
  { key: "m40", label: "40대 남성", color: "#8b5cf6", gender: "m" as const, ages: ["7", "8"] },
  { key: "m50", label: "50대+ 남성", color: "#06b6d4", gender: "m" as const, ages: ["9", "10", "11"] },
  { key: "f10", label: "10대 여성", color: "#ec4899", gender: "f" as const, ages: ["1", "2"] },
  { key: "f20", label: "20대 여성", color: "#f97316", gender: "f" as const, ages: ["3", "4"] },
  { key: "f30", label: "30대 여성", color: "#84cc16", gender: "f" as const, ages: ["5", "6"] },
  { key: "f40", label: "40대 여성", color: "#14b8a6", gender: "f" as const, ages: ["7", "8"] },
  { key: "f50", label: "50대+ 여성", color: "#6366f1", gender: "f" as const, ages: ["9", "10", "11"] },
];

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
    <div className="space-y-12">
      {/* Metrics Row */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </section>

      {/* Charts & Tables Row */}
      <section className="flex flex-col gap-8">
        <div className="w-full bg-card p-8 rounded-xl shadow-sm border border-muted/50 animate-pulse">
          <div className="h-4 w-32 bg-muted rounded mb-8"></div>
          <div className="h-64 bg-muted/50 rounded"></div>
        </div>
        <div className="w-full bg-card rounded-xl shadow-sm border border-muted/50 animate-pulse flex flex-col">
          <div className="p-6">
            <div className="h-4 w-24 bg-muted rounded"></div>
          </div>
          <div className="p-6 space-y-4 flex-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-muted/50 rounded"></div>
            ))}
          </div>
        </div>
      </section>

      {/* Section Analysis Skeleton */}
      <section>
        <div className="flex items-center gap-2 mb-4">
            <div className="h-5 w-5 bg-muted rounded animate-pulse"></div>
            <div className="h-6 w-24 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
        </div>
      </section>
      
      {/* Gender Distribution Skeleton */}
      <section>
        <div className="flex items-center gap-2 mb-4">
            <div className="h-5 w-5 bg-muted rounded animate-pulse"></div>
            <div className="h-6 w-32 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="bg-card p-6 rounded-xl shadow-sm border border-muted/50 animate-pulse">
           <div className="h-5 w-32 bg-muted rounded mb-4"></div>
           <div className="h-4 w-full bg-muted rounded-full"></div>
        </div>
      </section>

      {/* Demographics Skeleton */}
      <section>
        <div className="flex items-center gap-2 mb-4">
            <div className="h-5 w-5 bg-muted rounded animate-pulse"></div>
            <div className="h-6 w-32 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      </section>

      {/* AI Insights Skeleton */}
      <section>
        <div className="flex items-center gap-2 mb-4">
            <div className="h-5 w-5 bg-muted rounded animate-pulse"></div>
            <div className="h-6 w-24 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
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

async function fetchTrendPoints(
  keywords: string[],
  months: number,
  timeUnit?: string,
  gender?: string,
  ages?: string[],
): Promise<TrendPoint[]> {
  const res = await fetch("/api/trends", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keywords, months, timeUnit, gender, ages }),
  });
  if (!res.ok) throw new Error();
  const json = await res.json();
  return json.trends?.[0]?.data ?? [];
}

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
  const res = await fetch(`/api/keywords/saved?limit=200`, { cache: "no-store" });
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
  const profitMutation = useProfitMutation();
  const latestProfitRequestKey = useRef<string | null>(null);
  const searchParams = useSearchParams();
  const autoTriggered = useRef(false);
  const [inputValue, setInputValue] = useState("");
  const [submittedKeyword, setSubmittedKeyword] = useState("");
  const [tagCopied, setTagCopied] = useState(false);
  const [trendData, setTrendData] = useState<TrendPoint[] | null>(null);
  const [trendError, setTrendError] = useState(false);
  const [seasonality, setSeasonality] = useState<SeasonalityInfo | null>(null);
  const [allTagsCopied, setAllTagsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [demographics, setDemographics] = useState<DemographicsResponse | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [bookmarkError, setBookmarkError] = useState<string | null>(null);
  const [upgradeModal, setUpgradeModal] = useState<{ used: number; limit: number } | null>(null);
  const [genderRatio, setGenderRatio] = useState<{ male: number; female: number } | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileRef>(null);
  const [sortKey, setSortKey] = useState<"volume" | "competition" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [aiInsightsLoaded, setAiInsightsLoaded] = useState(false);
  const [trendMonths, setTrendMonths] = useState(12);
  const [trendTimeUnit, setTrendTimeUnit] = useState<"month" | "week">("month");
  const [demoFilters, setDemoFilters] = useState<Set<string>>(new Set(["all"]));
  const [demoSeriesMap, setDemoSeriesMap] = useState<Map<string, TrendPoint[]>>(new Map());
  const [compareKeywords, setCompareKeywords] = useState<string[]>([]);
  const [compareSeriesMap, setCompareSeriesMap] = useState<Map<string, TrendPoint[]>>(new Map());
  const [compareInput, setCompareInput] = useState("");

  // Progressive rendering: 3 separate data phases
  const [quickData, setQuickData] = useState<QuickResponse | null>(null);
  const [fullData, setFullData] = useState<FullResponse | null>(null);
  const [extraData, setExtraData] = useState<ExtraResponse | null>(null);
  const [quickPending, setQuickPending] = useState(false);
  const [fullPending, setFullPending] = useState(false);
  const [extraPending, setExtraPending] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  function fireAllPhases(keyword: string, token?: string) {
    // Front-end usage limit check — avoid unnecessary API call
    const storeState = useUserStore.getState();
    if (storeState.limits.dailySearch !== -1 && storeState.usage.search >= storeState.limits.dailySearch) {
      setUpgradeModal({ used: storeState.usage.search, limit: storeState.limits.dailySearch });
      return;
    }

    setQuickData(null);
    setFullData(null);
    setExtraData(null);
    setAnalyzeError(null);
    setQuickPending(true);
    setFullPending(true);
    setExtraPending(true);
    setAiInsightsLoaded(false);
    setDemoFilters(new Set(["all"]));
    setDemoSeriesMap(new Map());
    setCompareKeywords([]);
    setCompareSeriesMap(new Map());
    setTrendData(null);

    // Phase 1: quick must succeed before firing full+extra
    fetchQuick(keyword, token).then((result) => {
      setQuickData(result);
      setQuickPending(false);
      queryClient.setQueryData(["analyze-quick", result.keyword], result);
      useUserStore.getState().incrementUsage("search");
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["search-history"] });
      }, 3000);
      setTurnstileToken(null);
      turnstileRef.current?.reset();

      // Phase 2+3: fire full and extra in parallel after quick succeeds
      const effectiveKeyword = result.keyword;

      fetchFull(effectiveKeyword).then((fullResult) => {
        setFullData(fullResult);
        setFullPending(false);
        queryClient.setQueryData(["analyze-full", effectiveKeyword], fullResult);
      }).catch(() => {
        setFullPending(false);
      });

      fetchExtra(effectiveKeyword, {
        totalSearchVolume: result.totalSearchVolume,
        competition: result.competition,
        clickRate: result.clickRate,
      }).then((extraResult) => {
        setExtraData(extraResult);
        setExtraPending(false);
        queryClient.setQueryData(["analyze-extra", effectiveKeyword], extraResult);
      }).catch(() => {
        setExtraPending(false);
      });
    }).catch((err) => {
      setQuickPending(false);
      setFullPending(false);
      setExtraPending(false);
      if (err instanceof UsageLimitError) {
        setUpgradeModal({ used: err.used, limit: err.limit });
      }
      setAnalyzeError(err.message ?? "분석 중 오류가 발생했습니다.");
      setTurnstileToken(null);
      turnstileRef.current?.reset();
    });
  }

  // Derived data for rendering (backward-compatible with existing UI code)
  const isPending = quickPending && fullPending && extraPending;
  const isError = !!analyzeError && !quickData && !fullData;
  const error = analyzeError ? new Error(analyzeError) : null;

  const bookmarkMutation = useMutation({
    mutationFn: ({ keyword, saved }: { keyword: string; saved: boolean }) =>
      toggleSavedKeyword(keyword, saved),
    onSuccess: (nextSaved) => {
      setIsSaved(nextSaved);
      setBookmarkError(null);
      queryClient.invalidateQueries({ queryKey: ["savedKeywords"] });
    },
    onError: (err: Error) => {
      setBookmarkError(err.message);
    },
  });

  // Check saved state whenever full analysis result changes
  useEffect(() => {
    const kw = fullData?.analysis?.keyword ?? quickData?.keyword;
    if (!kw) return;
    setIsSaved(false);
    fetchIsKeywordSaved(kw).then(setIsSaved).catch(() => { });
  }, [fullData?.analysis?.keyword, quickData?.keyword]);

  // Auto-analyze from URL param: /analyze?keyword=검색어
  // Check cache first; only fetch if no cached data exists
  useEffect(() => {
    const keyword = searchParams.get("keyword");
    if (keyword && !autoTriggered.current) {
      autoTriggered.current = true;
      setInputValue(keyword);
      setSubmittedKeyword(keyword);
      // Try restoring from 3-phase cache
      const cachedQuick = queryClient.getQueryData<QuickResponse>(["analyze-quick", keyword]);
      const cachedFull = queryClient.getQueryData<FullResponse>(["analyze-full", keyword]);
      const cachedExtra = queryClient.getQueryData<ExtraResponse>(["analyze-extra", keyword]);
      if (cachedQuick || cachedFull) {
        if (cachedQuick) setQuickData(cachedQuick);
        if (cachedFull) setFullData(cachedFull);
        if (cachedExtra) setExtraData(cachedExtra);
        setIsSaved(false);
        fetchIsKeywordSaved(keyword).then(setIsSaved).catch(() => { });
        const cachedTrend = queryClient.getQueryData<TrendPoint[]>(["trend", keyword]);
        if (cachedTrend !== undefined) {
          setTrendData(cachedTrend);
          setTrendError(false);
        } else {
          setTrendData(null);
          setTrendError(false);
          const plan = cachedQuick?.plan ?? cachedFull?.plan;
          fetchTrendData(keyword, plan !== "free");
        }
        const cachedGender = queryClient.getQueryData<{ male: number; female: number } | null>(["gender", keyword]);
        if (cachedGender !== undefined) {
          setGenderRatio(cachedGender);
        }
      } else {
        setTrendData(null);
        setTrendError(false);
        fireAllPhases(keyword);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Fetch trend data whenever full analysis result changes
  useEffect(() => {
    if (!fullData?.analysis?.keyword) return;
    const plan = quickData?.plan ?? fullData?.plan;
    fetchTrendData(fullData.analysis.keyword, plan !== "free");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullData?.analysis?.keyword]);

  // Re-fetch when period or timeUnit controls change; clear stale demographic/compare data
  useEffect(() => {
    const keyword = fullData?.analysis?.keyword ?? quickData?.keyword;
    if (!keyword) return;
    setDemoSeriesMap(new Map());
    setCompareSeriesMap(new Map());
    setDemoFilters(new Set(["all"]));
    const plan = quickData?.plan ?? fullData?.plan;
    fetchTrendData(keyword, plan !== "free", trendMonths, trendTimeUnit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trendMonths, trendTimeUnit]);

  async function fetchTrendData(keyword: string, demographicsEnabled: boolean, months?: number, timeUnit?: string) {
    setTrendData(null);
    setTrendError(false);
    setGenderRatio(null);
    setSeasonality(null);
    try {
      const effectiveMonths = months ?? trendMonths;
      const effectiveUnit = timeUnit ?? trendTimeUnit;

      const trendRes = await fetch("/api/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: [keyword], months: effectiveMonths, timeUnit: effectiveUnit }),
      });
      if (!trendRes.ok) throw new Error();
      const trendJson = await trendRes.json();
      const points: TrendPoint[] = trendJson.trends?.[0]?.data ?? [];
      setTrendData(points);
      if (trendJson.seasonality) setSeasonality(trendJson.seasonality);
      queryClient.setQueryData(["trend", keyword], points);

      // Gender ratio: use demographics API (returns actual proportions, not relative indices)
      if (demographicsEnabled) {
        try {
          const demoRes = await fetch("/api/analyze/demographics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keyword }),
          });
          if (demoRes.ok) {
            const demoJson = await demoRes.json();
            const maleEntry = demoJson.gender?.find((g: { group: string; ratio: number }) => g.group === "남성");
            const femaleEntry = demoJson.gender?.find((g: { group: string; ratio: number }) => g.group === "여성");
            if (maleEntry && femaleEntry) {
              const ratio = { male: maleEntry.ratio, female: femaleEntry.ratio };
              setGenderRatio(ratio);
              queryClient.setQueryData(["gender", keyword], ratio);
            }
          }
        } catch { /* demographics unavailable, skip gender ratio */ }
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
    fireAllPhases(keyword, turnstileToken ?? undefined);
  }

  const analysis = fullData?.analysis ?? null;
  const relatedKeywordsRaw = extraData?.relatedKeywords ?? [];
  const sortedRelatedKeywords = useMemo(() => {
    if (!sortKey) return relatedKeywordsRaw;
    return [...relatedKeywordsRaw].sort((a, b) => {
      let diff = 0;
      if (sortKey === "volume") {
        diff = (a.pcSearchVolume + a.mobileSearchVolume) - (b.pcSearchVolume + b.mobileSearchVolume);
      } else {
        diff = (COMPETITION_ORDER[a.competition] ?? 1) - (COMPETITION_ORDER[b.competition] ?? 1);
      }
      return sortOrder === "asc" ? diff : -diff;
    });
  }, [relatedKeywordsRaw, sortKey, sortOrder]);
  const relatedKeywords = sortedRelatedKeywords;

  function handleSortClick(key: "volume" | "competition") {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  }
  const correctedKeyword = quickData?.correctedKeyword ?? fullData?.correctedKeyword ?? null;
  const hasAnyData = !!(quickData || fullData);

  function handleRelatedKeywordClick(keyword: string) {
    setInputValue(keyword);
    setSubmittedKeyword(keyword);
    setTrendData(null);
    setTrendError(false);
    fireAllPhases(keyword);
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

  function handleCsvDownload() {
    if (!trendData || trendData.length === 0) return;
    const vol = displayVolume?.totalSearchVolume;
    const maxR = Math.max(...trendData.map((d) => d.ratio), 1);
    const header = "날짜,검색량(추정),비율\n";
    const rows = [...trendData]
      .sort((a, b) => a.period.localeCompare(b.period))
      .map((d) => {
        const estVol = vol ? Math.round((d.ratio / maxR) * vol) : d.ratio;
        return `${d.period},${estVol},${d.ratio}`;
      })
      .join("\n");
    const csv = header + rows;
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trend_${submittedKeyword}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function fetchDemoFilterData(filterKey: string, keyword: string) {
    const filter = DEMO_FILTERS.find((f) => f.key === filterKey);
    if (!filter || filter.key === "all") return;
    try {
      const points = await fetchTrendPoints([keyword], trendMonths, trendTimeUnit, filter.gender, filter.ages);
      setDemoSeriesMap((prev) => {
        const next = new Map(prev);
        next.set(filterKey, points);
        return next;
      });
    } catch { /* ignore */ }
  }

  async function addCompareKeyword() {
    const kw = compareInput.trim();
    if (!kw || compareKeywords.includes(kw)) {
      setCompareInput("");
      return;
    }
    setCompareKeywords((prev) => [...prev, kw]);
    setCompareInput("");
    try {
      const points = await fetchTrendPoints([kw], trendMonths, trendTimeUnit);
      setCompareSeriesMap((prev) => {
        const next = new Map(prev);
        next.set(kw, points);
        return next;
      });
    } catch { /* ignore */ }
  }

  function removeCompareKeyword(kw: string) {
    setCompareKeywords((prev) => prev.filter((k) => k !== kw));
    setCompareSeriesMap((prev) => {
      const next = new Map(prev);
      next.delete(kw);
      return next;
    });
  }

  // Use quickData for early rendering, fall back to full analysis
  const displayVolume = quickData ?? (analysis ? {
    pcSearchVolume: analysis.pcSearchVolume,
    mobileSearchVolume: analysis.mobileSearchVolume,
    totalSearchVolume: analysis.totalSearchVolume,
    competition: analysis.competition,
    clickRate: analysis.clickRate,
  } : null);

  const pcRatio = displayVolume
    ? Math.round((displayVolume.pcSearchVolume / Math.max(displayVolume.totalSearchVolume, 1)) * 100)
    : 27;
  const mobileRatio = 100 - pcRatio;

  const gradeConfig = analysis ? getKeywordGradeConfig(analysis.keywordGrade) : null;

  const monthlyClicks = quickData?.estimatedClicks
    ?? (displayVolume ? Math.round(displayVolume.totalSearchVolume * displayVolume.clickRate) : 0);
  const isEstimated = quickData?.isEstimated || analysis?.isEstimated;
  const displayCompetition = displayVolume?.competition;
  const displayTotalSearchVolume = displayVolume?.totalSearchVolume;
  const mutateProfit = profitMutation.mutate;
  const currentProfitKeyword = quickData?.keyword ?? analysis?.keyword;

  const profitResult =
    profitMutation.data && profitMutation.data.keyword === currentProfitKeyword
      ? profitMutation.data
      : undefined;

  const profitErrorMessage =
    profitMutation.error && !profitResult ? profitMutation.error.message : null;

  useEffect(() => {
    if (!displayCompetition || displayTotalSearchVolume === undefined) return;
    const keyword = quickData?.keyword ?? analysis?.keyword;
    if (!keyword) return;

    const competition = toProfitCompetitionLevel(displayCompetition);
    const requestKey = `${keyword}:${displayTotalSearchVolume}:${monthlyClicks}:${competition}`;

    if (latestProfitRequestKey.current === requestKey) return;
    latestProfitRequestKey.current = requestKey;

    mutateProfit({
      keyword,
      searchVolume: displayTotalSearchVolume,
      expectedClicks: monthlyClicks,
      competition,
    });
  }, [
    analysis?.keyword,
    displayCompetition,
    displayTotalSearchVolume,
    monthlyClicks,
    mutateProfit,
    quickData?.keyword,
  ]);

  const COMPARE_COLORS = ["#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];
  const trendSeries = useMemo<TrendSeries[]>(() => {
    const result: TrendSeries[] = [];
    if (trendData) {
      result.push({ label: submittedKeyword || "전체", data: trendData, color: CHART_COLORS[0] });
    }
    for (const [filterKey, filterData] of demoSeriesMap) {
      const filter = DEMO_FILTERS.find((f) => f.key === filterKey);
      if (filter && demoFilters.has(filterKey)) {
        result.push({ label: filter.label, data: filterData, color: filter.color });
      }
    }
    compareKeywords.forEach((kw, i) => {
      const data = compareSeriesMap.get(kw);
      if (data) {
        result.push({ label: kw, data, color: COMPARE_COLORS[i % COMPARE_COLORS.length] });
      }
    });
    return result;
  }, [trendData, submittedKeyword, demoSeriesMap, demoFilters, compareKeywords, compareSeriesMap]);

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
                fireAllPhases(keyword, turnstileToken ?? undefined);
              }}
              disabled={quickPending}
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

      {/* Loading State — only show full skeleton when nothing has arrived yet */}
      {isPending && !hasAnyData && <LoadingSkeleton />}

      {/* Empty State */}
      {!quickPending && !fullPending && !hasAnyData && !isError && <EmptyState />}

      {/* Results — render progressively as data arrives */}
      {hasAnyData && (
        <>
          {/* Results Header with Tag Copy and Bookmark */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 mb-4">
            <h2 className="text-base font-bold text-muted-foreground">
              <span className="text-foreground">&apos;{submittedKeyword}&apos;</span> 분석 결과
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {/* Bookmark button */}
              <button
                onClick={() => {
                  const kw = analysis?.keyword ?? quickData?.keyword;
                  if (kw) bookmarkMutation.mutate({ keyword: kw, saved: isSaved });
                }}
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

          {/* Row 1: Key Metrics (renders with quickData) */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-5 gap-4 lg:gap-6 mb-12">
            {/* Monthly Volume */}
            {displayVolume ? (
              <div className="bg-card p-6 rounded-xl shadow-sm border border-muted/50">
                <p className="text-sm font-bold text-muted-foreground mb-2">월간 검색량</p>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-3xl font-extrabold tracking-tight">
                    {isEstimated ? "~" : ""}{displayVolume.totalSearchVolume.toLocaleString("ko-KR")}
                  </h2>
                  {isEstimated && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" title="SearchAd API가 차단한 키워드로, DataLab 데이터 기반 추정치입니다">
                      추정
                    </span>
                  )}
                  {gradeConfig && (
                    <span
                      className="px-2 py-0.5 text-[11px] font-extrabold rounded text-white"
                      style={{ backgroundColor: gradeConfig.color }}
                    >
                      {analysis?.keywordGrade}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">PC: {displayVolume.pcSearchVolume.toLocaleString("ko-KR")}</span>
                    <span className="text-muted-foreground">모바일: {displayVolume.mobileSearchVolume.toLocaleString("ko-KR")}</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full flex overflow-hidden">
                    <div className="h-full bg-blue-600" style={{ width: `${pcRatio}%` }}></div>
                    <div className="h-full bg-emerald-500" style={{ width: `${mobileRatio}%` }}></div>
                  </div>
                </div>
              </div>
            ) : <SkeletonCard />}

            {/* Competition */}
            {displayVolume ? (
              <div className="bg-card p-6 rounded-xl shadow-sm border border-muted/50">
                <p className="text-sm font-bold text-muted-foreground mb-2">경쟁도</p>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-3xl font-extrabold tracking-tight">{displayVolume.competition}</h2>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${competitionBadgeClass(displayVolume.competition)}`}>
                    {displayVolume.competition}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${competitionBarClass(displayVolume.competition)}`}
                    style={{ width: competitionBarWidth(displayVolume.competition) }}
                  ></div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">{competitionDescription(displayVolume.competition)}</p>
              </div>
            ) : <SkeletonCard />}

            {/* Monthly Clicks */}
            {displayVolume ? (
              <div className="bg-card p-6 rounded-xl shadow-sm border border-muted/50">
                <p className="text-sm font-bold text-muted-foreground mb-2">월간 예상 유입량</p>
                <h2 className="text-3xl font-extrabold tracking-tight mb-2">
                  {monthlyClicks.toLocaleString("ko-KR")}
                </h2>
                <div className="flex items-center gap-2 mt-4">
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                    CTR {(displayVolume.clickRate * 100).toFixed(1)}%
                  </span>
                  <span className="text-[11px] text-muted-foreground">검색량 x 클릭률</span>
                </div>
              </div>
            ) : <SkeletonCard />}

            {displayVolume ? (
              <ProfitScoreCard
                score={profitResult?.profitScore}
                signal={profitResult?.profitSignal}
                competition={profitResult?.inputMetrics.competition ?? toProfitCompetitionLevel(displayVolume.competition)}
                isLoading={profitMutation.isPending && !profitResult}
                errorMessage={profitErrorMessage}
              />
            ) : <SkeletonCard />}

            {/* Blog Posts — requires full analysis data */}
            {analysis ? (
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
            ) : <SkeletonCard />}
          </section>

          {/* Row 2: Charts & Tables */}
          <section className="flex flex-col gap-8 mb-12">
            {/* Trend Chart */}
            <div className="w-full bg-card p-8 rounded-xl shadow-sm border border-muted/50">
              {/* Rich toolbar header */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3 flex-wrap">
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
                  {seasonality && (
                    <span
                      className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400"
                      title={`매년 ${seasonality.peakMonthLabels.join(", ")}에 급상승 (${seasonality.strength === "strong" ? "강한" : seasonality.strength === "moderate" ? "보통" : "약한"} 계절성)`}
                    >
                      계절성 {seasonality.peakMonthLabels.join("·")}
                    </span>
                  )}
                  {/* Trend change rate badge */}
                  {trendData && trendData.length >= 2 && (() => {
                    const sorted = [...trendData].sort((a, b) => a.period.localeCompare(b.period));
                    const last = sorted[sorted.length - 1].ratio;
                    const prev = sorted[sorted.length - 2].ratio;
                    if (prev === 0) return null;
                    const pct = ((last - prev) / prev) * 100;
                    const isUp = pct >= 0;
                    return (
                      <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full ${isUp ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"}`}>
                        {isUp ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
                      </span>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={trendMonths}
                    onChange={(e) => setTrendMonths(Number(e.target.value))}
                    className="text-xs px-2 py-1.5 border border-muted/60 rounded-lg bg-background text-foreground focus:outline-none"
                  >
                    <option value={3}>3개월</option>
                    <option value={6}>6개월</option>
                    <option value={12}>1년</option>
                    {(quickData?.plan !== "free") && <option value={24}>2년</option>}
                  </select>
                  <select
                    value={trendTimeUnit}
                    onChange={(e) => setTrendTimeUnit(e.target.value as "month" | "week")}
                    className="text-xs px-2 py-1.5 border border-muted/60 rounded-lg bg-background text-foreground focus:outline-none"
                  >
                    <option value="month">월간</option>
                    <option value="week">주간</option>
                  </select>
                  <button
                    onClick={handleCsvDownload}
                    className="p-1.5 border border-muted/60 rounded-lg bg-background text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                    title="CSV 다운로드"
                  >
                    <Download className="size-4" />
                  </button>
                </div>
              </div>

              {/* Demographic filter checkboxes (basic/pro only) */}
              {quickData?.plan !== "free" && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 text-xs">
                  {DEMO_FILTERS.map((filter) => (
                    <label key={filter.key} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={demoFilters.has(filter.key)}
                        disabled={filter.key === "all"}
                        onChange={(e) => {
                          if (filter.key === "all") return;
                          const keyword = fullData?.analysis?.keyword ?? quickData?.keyword;
                          if (e.target.checked) {
                            setDemoFilters((prev) => new Set([...prev, filter.key]));
                            if (keyword && !demoSeriesMap.has(filter.key)) {
                              fetchDemoFilterData(filter.key, keyword);
                            }
                          } else {
                            setDemoFilters((prev) => {
                              const next = new Set(prev);
                              next.delete(filter.key);
                              return next;
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span style={{ color: filter.color }}>{filter.label}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Chart */}
              <KeywordTrendChart
                series={trendSeries}
                error={trendError}
                loading={!trendData && !trendError}
                totalVolume={displayVolume?.totalSearchVolume}
                showMarkers={true}
                showForecast={quickData?.plan === "pro"}
                plan={quickData?.plan}
              />

              {/* Compare keyword input */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <input
                  placeholder="비교 키워드 추가..."
                  value={compareInput}
                  onChange={(e) => setCompareInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCompareKeyword(); } }}
                  className="text-sm px-3 py-1.5 border border-muted/60 rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                <button
                  onClick={addCompareKeyword}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-muted/60 bg-muted/20 hover:bg-muted/50 transition-colors"
                >
                  추가
                </button>
                {compareKeywords.map((kw) => (
                  <span key={kw} className="px-2 py-0.5 text-xs rounded-full bg-muted flex items-center gap-1">
                    {kw}
                    <button
                      onClick={() => removeCompareKeyword(kw)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Related Keywords Table */}
            <div className="w-full bg-card rounded-xl shadow-sm border border-muted/50 flex flex-col overflow-hidden">
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
              <div className="flex-1 overflow-x-hidden overflow-y-auto max-h-[360px] custom-scrollbar">
                {extraPending && relatedKeywords.length === 0 ? (
                  <div className="p-6 space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-10 bg-muted/50 rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : relatedKeywords.length > 0 ? (
                  <table className="w-full min-w-[360px] text-left border-collapse">
                    <thead className="bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-widest border-b border-muted/50">
                      <tr>
                        <th className="px-6 py-3">키워드</th>
                        <th className="px-4 py-3 text-right">
                          <button
                            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                            onClick={() => handleSortClick("volume")}
                          >
                            검색량
                            {sortKey === "volume" ? (
                              sortOrder === "desc" ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />
                            ) : (
                              <ChevronDown className="size-3 opacity-30" />
                            )}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-center">
                          <button
                            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                            onClick={() => handleSortClick("competition")}
                          >
                            경쟁도
                            {sortKey === "competition" ? (
                              sortOrder === "desc" ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />
                            ) : (
                              <ChevronDown className="size-3 opacity-30" />
                            )}
                          </button>
                        </th>
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
                            const mainKw = analysis?.keyword ?? quickData?.keyword ?? "";
                            window.location.href = `/compare?keywords=${encodeURIComponent(mainKw)},${encodeURIComponent(rk.keyword)}`;
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

          {/* Section Analysis — skeleton while full data loads */}
          {!analysis && fullPending && (
            <section className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <LayoutGrid className="size-5 text-primary" />
                <h3 className="text-lg font-bold">섹션 분석</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
              </div>
            </section>
          )}
          {analysis?.sectionData && (
            <section className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <LayoutGrid className="size-5 text-primary" />
                <h3 className="text-lg font-bold">섹션 분석</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {(
                  [
                    { key: "blog", label: "블로그" },
                    { key: "cafe", label: "카페" },
                    { key: "kin", label: "지식iN" },
                    { key: "shopping", label: "쇼핑" },
                    { key: "news", label: "뉴스" },
                  ] as const
                ).map(({ key, label }) => {
                  const section = analysis.sectionData![key as keyof typeof analysis.sectionData];
                  if (!section) return null;
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
          {((!trendData && quickData?.plan !== "free") || genderRatio) && (
            <section className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <Gauge className="size-5 text-primary" />
                <h3 className="text-lg font-bold">검색자 성별 분포</h3>
              </div>
              {!trendData ? (
                <div className="bg-card p-6 rounded-xl shadow-sm border border-muted/50 animate-pulse">
                  <div className="h-5 w-32 bg-muted rounded mb-4"></div>
                  <div className="h-4 w-full bg-muted rounded-full"></div>
                </div>
              ) : genderRatio ? (
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
              ) : null}
            </section>
          )}

          {/* Top Posts */}
          {analysis?.topPosts && analysis.topPosts.length > 0 && (
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

          {/* Demographics (On-demand) */}
          {hasAnyData && quickData?.plan !== "free" && (
            <section className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <Gauge className="size-5 text-primary" />
                <h3 className="text-lg font-bold">인구통계 분석</h3>
                {!demographics && !demoLoading && (
                  <button
                    onClick={async () => {
                      const kw = analysis?.keyword ?? quickData?.keyword;
                      if (!kw) return;
                      setDemoLoading(true);
                      try {
                        const res = await fetch("/api/analyze/demographics", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ keyword: kw }),
                        });
                        if (res.ok) setDemographics(await res.json());
                      } catch { /* ignore */ }
                      setDemoLoading(false);
                    }}
                    className="ml-2 px-3 py-1 text-xs font-bold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    데이터 불러오기
                  </button>
                )}
              </div>
              {demoLoading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
                </div>
              )}
              {demographics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Gender */}
                  {demographics.gender.length > 0 && (
                    <div className="bg-card p-5 rounded-xl shadow-sm border border-muted/50">
                      <p className="text-sm font-bold text-muted-foreground mb-3">성별</p>
                      <div className="space-y-2">
                        {demographics.gender.map((g) => (
                          <div key={g.group} className="flex items-center gap-3">
                            <span className={`size-3 rounded-full ${g.group === "남성" ? "bg-blue-500" : "bg-pink-500"}`} />
                            <span className="text-sm font-semibold flex-1">{g.group}</span>
                            <span className="text-sm font-bold">{g.ratio}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Device */}
                  {demographics.device.length > 0 && (
                    <div className="bg-card p-5 rounded-xl shadow-sm border border-muted/50">
                      <p className="text-sm font-bold text-muted-foreground mb-3">기기</p>
                      <div className="space-y-2">
                        {demographics.device.map((d) => (
                          <div key={d.group} className="flex items-center gap-3">
                            <span className={`size-3 rounded-full ${d.group === "PC" ? "bg-indigo-500" : "bg-emerald-500"}`} />
                            <span className="text-sm font-semibold flex-1">{d.group}</span>
                            <span className="text-sm font-bold">{d.ratio}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Age */}
                  {demographics.age.length > 0 && (
                    <div className="bg-card p-5 rounded-xl shadow-sm border border-muted/50">
                      <p className="text-sm font-bold text-muted-foreground mb-3">연령대</p>
                      <div className="space-y-2">
                        {demographics.age.map((a) => (
                          <div key={a.group}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-semibold">{a.group}</span>
                              <span className="font-bold">{a.ratio}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${a.ratio}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {!demographics && !demoLoading && (
                <p className="text-xs text-muted-foreground">성별, 기기, 연령대별 검색 비율을 확인하세요. (DataLab API 9회 소비)</p>
              )}
            </section>
          )}
          {hasAnyData && quickData?.plan === "free" && (
            <section className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <Gauge className="size-5 text-muted-foreground/50" />
                <h3 className="text-lg font-bold text-muted-foreground/50">인구통계 분석</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-muted text-muted-foreground">BASIC</span>
              </div>
              <div className="relative rounded-xl overflow-hidden border border-muted/50">
                {/* Blurred preview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 blur-sm pointer-events-none select-none" aria-hidden>
                  {[["성별", ["남성 62%", "여성 38%"]], ["기기", ["PC 45%", "모바일 55%"]], ["연령대", ["20대 30%", "30대 35%", "40대 25%"]]].map(([title, rows]) => (
                    <div key={title as string} className="bg-card p-5 rounded-xl shadow-sm border border-muted/50">
                      <p className="text-sm font-bold text-muted-foreground mb-3">{title as string}</p>
                      <div className="space-y-2">
                        {(rows as string[]).map((r) => (
                          <div key={r} className="flex items-center gap-3">
                            <span className="size-3 rounded-full bg-muted" />
                            <span className="text-sm font-semibold flex-1">{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Lock overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 backdrop-blur-[2px]">
                  <Lock className="size-8 text-muted-foreground mb-3" />
                  <p className="text-sm font-bold mb-1">인구통계 분석</p>
                  <p className="text-xs text-muted-foreground mb-4 text-center px-4">성별, 기기, 연령대별 검색 비율을 확인하세요</p>
                  <button
                    onClick={() => setUpgradeModal({ used: 0, limit: 0 })}
                    className="px-5 py-2 text-sm font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                  >
                    베이직 플랜으로 업그레이드
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* AI Insights — free plan lock */}
          {hasAnyData && quickData?.plan === "free" && (
            <section className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="size-5 text-muted-foreground/50" />
                <h3 className="text-lg font-bold text-muted-foreground/50">AI 인사이트</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-muted text-muted-foreground">BASIC</span>
              </div>
              <div className="relative rounded-xl overflow-hidden border border-muted/50">
                {/* Blurred preview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 blur-sm pointer-events-none select-none" aria-hidden>
                  {[["검색 의도", "구매성 키워드로 분류됩니다"], ["콘텐츠 전략", "추천: 경쟁이 낮아 상위 노출 가능성이 높습니다"], ["키워드 클러스터", "관련 키워드 그룹화 분석"]].map(([title, desc]) => (
                    <div key={title as string} className="bg-card p-5 rounded-xl shadow-sm border border-muted/50">
                      <p className="text-sm font-bold text-muted-foreground mb-2">{title as string}</p>
                      <p className="text-xs text-muted-foreground">{desc as string}</p>
                    </div>
                  ))}
                </div>
                {/* Lock overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 backdrop-blur-[2px]">
                  <Lock className="size-8 text-muted-foreground mb-3" />
                  <p className="text-sm font-bold mb-1">AI 인사이트</p>
                  <p className="text-xs text-muted-foreground mb-4 text-center px-4">검색 의도 분류, 콘텐츠 전략, 키워드 클러스터링을 확인하세요</p>
                  <button
                    onClick={() => setUpgradeModal({ used: 0, limit: 0 })}
                    className="px-5 py-2 text-sm font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                  >
                    베이직 플랜으로 업그레이드
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* AI Insights — basic/pro */}
          {quickData?.plan !== "free" && (extraPending || extraData?.intent || extraData?.strategy || extraData?.clusters) && (
            <section className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="size-5 text-primary" />
                <h3 className="text-lg font-bold">AI 인사이트</h3>
                {!aiInsightsLoaded && !extraPending && (extraData?.intent || extraData?.strategy || extraData?.clusters) && (
                  <button
                    onClick={() => setAiInsightsLoaded(true)}
                    className="ml-2 px-3 py-1 text-xs font-bold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1"
                  >
                    <Sparkles className="size-3" />
                    AI 분석 시작
                  </button>
                )}
              </div>
              {extraPending && (!extraData?.intent && !extraData?.strategy) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
                </div>
              )}
              {aiInsightsLoaded && extraData && (!extraPending || extraData.intent || extraData.strategy) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Intent */}
                {extraData.intent && (
                  <div className="bg-card p-5 rounded-xl shadow-sm border border-muted/50">
                    <p className="text-sm font-bold text-muted-foreground mb-2">검색 의도</p>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2.5 py-1 text-sm font-bold rounded-lg ${
                        extraData.intent.intent === "구매성"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : extraData.intent.intent === "탐색성"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                      }`}>
                        {extraData.intent.intent}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(extraData.intent.confidence * 100)}% 확신
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{extraData.intent.reason}</p>
                  </div>
                )}

                {/* Strategy */}
                {extraData.strategy && (
                  <div className="bg-card p-5 rounded-xl shadow-sm border border-muted/50">
                    <p className="text-sm font-bold text-muted-foreground mb-2">콘텐츠 전략</p>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2.5 py-1 text-sm font-bold rounded-lg ${
                        extraData.strategy.verdict === "추천"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : extraData.strategy.verdict === "비추천"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                      }`}>
                        {extraData.strategy.verdict}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{extraData.strategy.reason}</p>
                    {extraData.strategy.tips.length > 0 && (
                      <ul className="space-y-1">
                        {extraData.strategy.tips.map((tip, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                            <span className="text-primary shrink-0">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Content Spec */}
                {extraData.contentSpec && (
                  <div className="bg-card p-5 rounded-xl shadow-sm border border-muted/50">
                    <p className="text-sm font-bold text-muted-foreground mb-2">상위 노출 콘텐츠 스펙</p>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">평균 제목 길이</p>
                        <p className="text-lg font-bold">{extraData.contentSpec.avgTitleLength}자</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">평균 설명 길이</p>
                        <p className="text-lg font-bold">{extraData.contentSpec.avgDescLength}자</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">상위 {extraData.contentSpec.count}개 결과 기준</p>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* Keyword Clusters */}
              {aiInsightsLoaded && extraData?.clusters && extraData.clusters.length > 0 && (
                <div className="mt-4 bg-card p-5 rounded-xl shadow-sm border border-muted/50">
                  <p className="text-sm font-bold text-muted-foreground mb-3">연관 키워드 클러스터</p>
                  <div className="flex flex-wrap gap-4">
                    {extraData.clusters.map((cluster, ci) => (
                      <div key={ci} className="flex-1 min-w-[200px]">
                        <p className="text-xs font-bold text-primary mb-2">{cluster.label}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {cluster.keywords.map((kw) => (
                            <button
                              key={kw}
                              onClick={() => handleRelatedKeywordClick(kw)}
                              className="px-2 py-0.5 text-xs rounded-full bg-muted/50 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                            >
                              {kw}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Row 3: Quick Actions */}
          {(analysis || quickData) && (
          <section className="mb-12">
            <h3 className="text-lg font-bold mb-6">빠른 실행</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Compare */}
              <a
                href={`/compare?keywords=${encodeURIComponent(analysis?.keyword ?? quickData?.keyword ?? "")}`}
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
                href={`/ai?keyword=${encodeURIComponent(analysis?.keyword ?? quickData?.keyword ?? "")}&tab=title`}
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
                href={`/ai?keyword=${encodeURIComponent(analysis?.keyword ?? quickData?.keyword ?? "")}&tab=draft`}
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
          )}

          {/* Bottom Actions */}
          {(analysis || quickData) && (
          <footer className="flex flex-col sm:flex-row justify-center gap-4 border-t border-muted/50 pt-10">
            <button
              onClick={() => {
                const kw = analysis?.keyword ?? quickData?.keyword;
                if (kw) bookmarkMutation.mutate({ keyword: kw, saved: isSaved });
              }}
              disabled={bookmarkMutation.isPending}
              className={`w-full sm:w-auto px-10 py-4 rounded-xl font-bold shadow-lg transition-all disabled:opacity-60 ${isSaved
                ? "bg-amber-500 text-white shadow-amber-500/20 hover:bg-amber-600"
                : "bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90"
                }`}
            >
              <span className="flex items-center justify-center gap-2">
                <Star className={`size-5 ${isSaved ? "fill-white" : ""}`} />
                {bookmarkMutation.isPending ? "처리 중…" : isSaved ? "저장됨" : "키워드 저장"}
              </span>
            </button>
            <a
              href={`/compare?keywords=${encodeURIComponent(analysis?.keyword ?? quickData?.keyword ?? "")}`}
              className="w-full sm:w-auto px-10 py-4 bg-muted/50 text-foreground rounded-xl font-bold hover:bg-muted transition-colors flex items-center justify-center gap-2"
            >
              <ArrowRightLeft className="size-5" />
              비교에 추가
            </a>
          </footer>
          )}
        </>
      )}
    </div>
  );
}
