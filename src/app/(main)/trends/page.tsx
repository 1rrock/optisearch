"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Search,
  Plus,
  X,
  Loader2,
  AlertCircle,
  Calendar,
  Users,
  Smartphone,
  Monitor,
  BarChart3,
  PieChart,
  Flame,
  Sparkles,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { PageHeader } from "@/shared/ui/page-header";
import { UpgradeModal } from "@/shared/components/UpgradeModal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TrendPoint {
  period: string;
  ratio: number;
}

interface TrendResult {
  keyword: string;
  data: TrendPoint[];
}

interface DemographicData {
  gender: { male: number; female: number };
  age: { group: string; ratio: number }[];
  device: { pc: number; mobile: number };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444"];

const PERIOD_OPTIONS = [
  { label: "1개월", value: 1 },
  { label: "3개월", value: 3 },
  { label: "6개월", value: 6 },
  { label: "1년", value: 12 },
  { label: "2년", value: 24 },
];

const AGE_GROUPS = [
  { label: "10대", values: ["1", "2"] },
  { label: "20대", values: ["3", "4"] },
  { label: "30대", values: ["5", "6"] },
  { label: "40대", values: ["7", "8"] },
  { label: "50대", values: ["9", "10"] },
  { label: "60대+", values: ["11"] },
];

// ---------------------------------------------------------------------------
// Line Chart Component (SVG)
// ---------------------------------------------------------------------------

function TrendLineChart({
  trends,
  height = 320,
}: {
  trends: TrendResult[];
  height?: number;
}) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    period: string;
    values: { keyword: string; ratio: number; color: string }[];
  } | null>(null);

  if (trends.length === 0 || trends.every((t) => t.data.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        데이터가 없습니다.
      </div>
    );
  }

  const W = 900;
  const H = height;
  const PAD = { top: 20, right: 30, bottom: 50, left: 50 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const allPeriods = Array.from(
    new Set(trends.flatMap((t) => t.data.map((d) => d.period)))
  ).sort();

  if (allPeriods.length === 0) return null;

  const xStep = chartW / Math.max(allPeriods.length - 1, 1);
  const xOf = (period: string) => PAD.left + allPeriods.indexOf(period) * xStep;
  const yOf = (ratio: number) => PAD.top + chartH - (ratio / 100) * chartH;

  const yTicks = [0, 25, 50, 75, 100];
  const xTickStep = Math.max(1, Math.floor(allPeriods.length / 8));
  const xTicks = allPeriods.filter((_, i) => i % xTickStep === 0);

  // Create smooth path with bezier curves
  function smoothPath(points: { x: number; y: number }[]): string {
    if (points.length < 2) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  }

  return (
    <div className="w-full overflow-x-auto relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[500px]"
        style={{ height: H }}
        aria-label="키워드 트렌드 차트"
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Background gradient */}
        <defs>
          {trends.map((_, ti) => (
            <linearGradient
              key={ti}
              id={`gradient-${ti}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={COLORS[ti % COLORS.length]} stopOpacity="0.15" />
              <stop offset="100%" stopColor={COLORS[ti % COLORS.length]} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* Grid lines */}
        {yTicks.map((v) => (
          <line
            key={v}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={yOf(v)}
            y2={yOf(v)}
            stroke="currentColor"
            strokeOpacity={0.06}
            strokeWidth={1}
          />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((v) => (
          <text
            key={v}
            x={PAD.left - 12}
            y={yOf(v) + 4}
            textAnchor="end"
            fontSize={11}
            fill="currentColor"
            fillOpacity={0.4}
            fontFamily="system-ui"
          >
            {v}
          </text>
        ))}

        {/* X-axis labels */}
        {xTicks.map((period) => (
          <text
            key={period}
            x={xOf(period)}
            y={H - 10}
            textAnchor="middle"
            fontSize={10}
            fill="currentColor"
            fillOpacity={0.4}
            fontFamily="system-ui"
          >
            {period.slice(0, 7)}
          </text>
        ))}

        {/* Area fills */}
        {trends.map((trend, ti) => {
          const points = trend.data
            .filter((d) => allPeriods.includes(d.period))
            .sort((a, b) => a.period.localeCompare(b.period))
            .map((pt) => ({ x: xOf(pt.period), y: yOf(pt.ratio) }));

          if (points.length < 2) return null;

          const areaPath =
            smoothPath(points) +
            ` L ${points[points.length - 1].x} ${yOf(0)} L ${points[0].x} ${yOf(0)} Z`;

          return (
            <path
              key={`area-${trend.keyword}`}
              d={areaPath}
              fill={`url(#gradient-${ti})`}
            />
          );
        })}

        {/* Lines */}
        {trends.map((trend, ti) => {
          const color = COLORS[ti % COLORS.length];
          const points = trend.data
            .filter((d) => allPeriods.includes(d.period))
            .sort((a, b) => a.period.localeCompare(b.period))
            .map((pt) => ({ x: xOf(pt.period), y: yOf(pt.ratio) }));

          if (points.length < 2) return null;

          return (
            <path
              key={trend.keyword}
              d={smoothPath(points)}
              fill="none"
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {/* Data points */}
        {trends.map((trend, ti) => {
          const color = COLORS[ti % COLORS.length];
          return trend.data.map((pt) => (
            <circle
              key={`${trend.keyword}-${pt.period}`}
              cx={xOf(pt.period)}
              cy={yOf(pt.ratio)}
              r={3}
              fill="white"
              stroke={color}
              strokeWidth={2}
              className="cursor-pointer"
              onMouseEnter={(e) => {
                const svgRect = (e.target as SVGElement)
                  .closest("svg")
                  ?.getBoundingClientRect();
                if (!svgRect) return;
                setTooltip({
                  x: xOf(pt.period),
                  y: yOf(pt.ratio),
                  period: pt.period,
                  values: trends
                    .map((t, i) => {
                      const d = t.data.find((dp) => dp.period === pt.period);
                      return {
                        keyword: t.keyword,
                        ratio: d?.ratio ?? 0,
                        color: COLORS[i % COLORS.length],
                      };
                    })
                    .filter((v) => v.ratio > 0),
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          ));
        })}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <line
              x1={tooltip.x}
              x2={tooltip.x}
              y1={PAD.top}
              y2={PAD.top + chartH}
              stroke="currentColor"
              strokeOpacity={0.15}
              strokeWidth={1}
              strokeDasharray="4,4"
            />
            <foreignObject
              x={Math.min(tooltip.x + 10, W - 180)}
              y={Math.max(tooltip.y - 50, PAD.top)}
              width={160}
              height={24 + tooltip.values.length * 22}
            >
              <div className="bg-card border border-muted/50 shadow-lg rounded-lg p-2.5 text-xs">
                <p className="font-semibold text-foreground/80 mb-1">
                  {tooltip.period.slice(0, 7)}
                </p>
                {tooltip.values.map((v) => (
                  <div key={v.keyword} className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: v.color }}
                    />
                    <span className="text-muted-foreground truncate">{v.keyword}</span>
                    <span className="ml-auto font-bold">{v.ratio}</span>
                  </div>
                ))}
              </div>
            </foreignObject>
          </g>
        )}
      </svg>

      {/* Legend */}
      {trends.length > 1 && (
        <div className="flex flex-wrap gap-4 mt-3 px-1">
          {trends.map((trend, ti) => (
            <div key={trend.keyword} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[ti % COLORS.length] }}
              />
              <span className="text-sm font-medium">{trend.keyword}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Demographics Charts
// ---------------------------------------------------------------------------

function GenderChart({ data }: { data: DemographicData["gender"] }) {
  const total = data.male + data.female;
  if (total === 0) return <p className="text-sm text-muted-foreground text-center py-8">데이터 없음</p>;

  const malePercent = Math.round((data.male / total) * 100);
  const femalePercent = 100 - malePercent;

  // Donut chart
  const R = 60;
  const r = 40;
  const cx = 80;
  const cy = 80;

  const maleAngle = (malePercent / 100) * 360;

  function arcPath(startAngle: number, endAngle: number, radius: number): string {
    const start = polarToCartesian(cx, cy, radius, startAngle);
    const end = polarToCartesian(cx, cy, radius, endAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  }

  function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(angleRad),
      y: cy + radius * Math.sin(angleRad),
    };
  }

  return (
    <div className="flex items-center gap-6">
      <svg width={160} height={160} viewBox="0 0 160 160">
        {/* Female arc (background full) */}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f472b6" strokeWidth={20} opacity={0.9} />
        {/* Male arc overlay */}
        {malePercent > 0 && malePercent < 100 && (
          <path
            d={arcPath(0, maleAngle, R)}
            fill="none"
            stroke="#60a5fa"
            strokeWidth={20}
            strokeLinecap="round"
          />
        )}
        {malePercent === 100 && (
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="#60a5fa" strokeWidth={20} />
        )}
        {/* Center text */}
        <circle cx={cx} cy={cy} r={r - 5} className="fill-background" />
      </svg>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-400" />
          <span className="text-sm">남성</span>
          <span className="ml-auto text-lg font-extrabold">{malePercent}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-pink-400" />
          <span className="text-sm">여성</span>
          <span className="ml-auto text-lg font-extrabold">{femalePercent}%</span>
        </div>
      </div>
    </div>
  );
}

function AgeChart({ data }: { data: DemographicData["age"] }) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">데이터 없음</p>;

  const maxRatio = Math.max(...data.map((d) => d.ratio), 1);

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const pct = Math.round((item.ratio / maxRatio) * 100);
        return (
          <div key={item.group} className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground w-12 shrink-0">
              {item.group}
            </span>
            <div className="flex-1 h-7 bg-muted/30 rounded-lg overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-lg transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold">
                {Math.round(item.ratio)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DeviceChart({ data }: { data: DemographicData["device"] }) {
  const total = data.pc + data.mobile;
  if (total === 0) return <p className="text-sm text-muted-foreground text-center py-8">데이터 없음</p>;

  const pcPercent = Math.round((data.pc / total) * 100);
  const mobilePercent = 100 - pcPercent;

  return (
    <div className="flex items-center gap-6">
      <div className="flex-1 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="size-4 text-blue-500" />
              <span className="text-sm font-medium">PC</span>
            </div>
            <span className="text-lg font-extrabold">{pcPercent}%</span>
          </div>
          <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${pcPercent}%` }}
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="size-4 text-emerald-500" />
              <span className="text-sm font-medium">모바일</span>
            </div>
            <span className="text-lg font-extrabold">{mobilePercent}%</span>
          </div>
          <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${mobilePercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Period Pill
// ---------------------------------------------------------------------------

function PeriodPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all border ${active
        ? "bg-foreground text-background border-foreground shadow-sm"
        : "bg-card text-muted-foreground border-muted/50 hover:border-foreground/30 hover:text-foreground"
        }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// SVG Word Cloud — Archimedean Spiral Placement
// ---------------------------------------------------------------------------

interface WordCloudItem {
  keyword: string;
  volume: number;
  changeRate: number;
  direction: "up" | "down" | "stable";
}

interface PlacedWord {
  keyword: string;
  x: number;
  y: number;
  fontSize: number;
  width: number;
  height: number;
  color: string;
  volume: number;
  changeRate: number;
  direction: "up" | "down" | "stable";
}

function getWordColor(direction: "up" | "down" | "stable", changeRate: number): string {
  if (direction === "up") {
    const intensity = Math.min(Math.abs(changeRate) / 100, 1);
    if (intensity > 0.6) return "#e11d48"; // rose-600
    if (intensity > 0.3) return "#ea580c"; // orange-600
    return "#d97706"; // amber-600
  }
  if (direction === "down") {
    const intensity = Math.min(Math.abs(changeRate) / 100, 1);
    if (intensity > 0.6) return "#2563eb"; // blue-600
    if (intensity > 0.3) return "#0891b2"; // cyan-600
    return "#0d9488"; // teal-600
  }
  return "#6b7280"; // gray-500
}

function getWordColorDark(direction: "up" | "down" | "stable", changeRate: number): string {
  if (direction === "up") {
    const intensity = Math.min(Math.abs(changeRate) / 100, 1);
    if (intensity > 0.6) return "#fb7185"; // rose-400
    if (intensity > 0.3) return "#fb923c"; // orange-400
    return "#fbbf24"; // amber-400
  }
  if (direction === "down") {
    const intensity = Math.min(Math.abs(changeRate) / 100, 1);
    if (intensity > 0.6) return "#60a5fa"; // blue-400
    if (intensity > 0.3) return "#22d3ee"; // cyan-400
    return "#2dd4bf"; // teal-400
  }
  return "#9ca3af"; // gray-400
}

// Lazy singleton canvas for text measurement — avoids useEffect timing issues
let _measureCanvas: HTMLCanvasElement | null = null;
function getMeasureCanvas(): HTMLCanvasElement {
  if (!_measureCanvas) {
    _measureCanvas = document.createElement("canvas");
    _measureCanvas.width = 1;
    _measureCanvas.height = 1;
  }
  return _measureCanvas;
}

function TrendingWordCloud({ keywords }: { keywords: WordCloudItem[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Mark mounted — ensures canvas APIs are available (SSR safety)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Detect dark mode
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const placedWords = useMemo(() => {
    if (!mounted || keywords.length === 0) return [];

    const ctx = getMeasureCanvas().getContext("2d");
    if (!ctx) return [];

    // Sort by weight (abs changeRate) descending — largest first
    const sorted = [...keywords].sort(
      (a, b) => Math.abs(b.changeRate) - Math.abs(a.changeRate)
    );

    const maxRate = Math.max(...sorted.map((k) => Math.abs(k.changeRate)), 1);
    const minRate = Math.min(...sorted.map((k) => Math.abs(k.changeRate)), 0);
    const range = maxRate - minRate || 1;

    const MIN_FONT = 14;
    const MAX_FONT = 48;

    const placed: PlacedWord[] = [];
    const rects: { x: number; y: number; w: number; h: number }[] = [];

    // AABB collision check with padding
    function collides(
      nx: number,
      ny: number,
      nw: number,
      nh: number
    ): boolean {
      const pad = 4;
      for (const r of rects) {
        if (
          nx - pad < r.x + r.w &&
          nx + nw + pad > r.x &&
          ny - pad < r.y + r.h &&
          ny + nh + pad > r.y
        ) {
          return true;
        }
      }
      return false;
    }

    for (const kw of sorted) {
      const normalized = (Math.abs(kw.changeRate) - minRate) / range;
      const fontSize = Math.round(MIN_FONT + normalized * (MAX_FONT - MIN_FONT));

      ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
      const metrics = ctx.measureText(kw.keyword);
      const textWidth = metrics.width * 1.15; // 15% CJK padding
      const textHeight = fontSize * 1.3;

      // Archimedean spiral — tighter spacing, start with slight random offset for variety
      const a = 2.5;
      const tStep = 0.25;
      // Alternate initial angle per word to avoid directional bias
      const startAngle = placed.length * 0.7;
      let t = startAngle;
      let foundPos = false;
      let px = 0;
      let py = 0;

      for (let attempts = 0; attempts < 800; attempts++) {
        const spiralR = a * (t - startAngle);
        const spiralX = spiralR * Math.cos(t);
        const spiralY = spiralR * Math.sin(t);

        px = spiralX - textWidth / 2;
        py = spiralY - textHeight / 2;

        if (!collides(px, py, textWidth, textHeight)) {
          foundPos = true;
          break;
        }

        t += tStep;
      }

      if (!foundPos) continue;

      const color = isDark
        ? getWordColorDark(kw.direction, kw.changeRate)
        : getWordColor(kw.direction, kw.changeRate);

      placed.push({
        keyword: kw.keyword,
        x: px,
        y: py,
        fontSize,
        width: textWidth,
        height: textHeight,
        color,
        volume: kw.volume,
        changeRate: kw.changeRate,
        direction: kw.direction,
      });

      rects.push({ x: px, y: py, w: textWidth, h: textHeight });
    }

    return placed;
  }, [keywords, isDark, mounted]);

  // Compute viewBox — centered around origin with symmetric padding
  const viewBox = useMemo(() => {
    if (placedWords.length === 0) return { x: -200, y: -100, w: 400, h: 200 };

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const w of placedWords) {
      minX = Math.min(minX, w.x);
      minY = Math.min(minY, w.y);
      maxX = Math.max(maxX, w.x + w.width);
      maxY = Math.max(maxY, w.y + w.height);
    }

    // Make viewBox symmetric around origin for centered appearance
    const absX = Math.max(Math.abs(minX), Math.abs(maxX));
    const absY = Math.max(Math.abs(minY), Math.abs(maxY));
    const pad = 25;
    return {
      x: -absX - pad,
      y: -absY - pad,
      w: (absX + pad) * 2,
      h: (absY + pad) * 2,
    };
  }, [placedWords]);

  if (keywords.length === 0) return null;

  return (
    <div className="relative w-full h-full flex items-center justify-center" style={{ minHeight: 300 }}>
      <svg
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        className="w-full h-full"
        style={{ minHeight: 300, maxHeight: 420 }}
        aria-label="인기 키워드 워드클라우드"
        preserveAspectRatio="xMidYMid meet"
      >
        {placedWords.map((word, idx) => (
          <g key={word.keyword}>
            <text
              x={word.x + word.width / 2}
              y={word.y + word.height * 0.75}
              textAnchor="middle"
              fontSize={word.fontSize}
              fontWeight="bold"
              fontFamily="system-ui, -apple-system, sans-serif"
              fill={word.color}
              opacity={hoveredIdx !== null && hoveredIdx !== idx ? 0.35 : 1}
              className="cursor-pointer transition-opacity duration-150"
              style={{ userSelect: "none" }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() =>
                window.open(
                  `/analyze?keyword=${encodeURIComponent(word.keyword)}`,
                  "_blank"
                )
              }
            >
              {word.keyword}
            </text>
            {/* Invisible hit area for easier hovering */}
            <rect
              x={word.x}
              y={word.y}
              width={word.width}
              height={word.height}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() =>
                window.open(
                  `/analyze?keyword=${encodeURIComponent(word.keyword)}`,
                  "_blank"
                )
              }
            />
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {hoveredIdx !== null && placedWords[hoveredIdx] && (
        <div
          className="absolute pointer-events-none z-10 bg-card border border-muted/50 shadow-lg rounded-lg px-3 py-2 text-xs"
          style={{
            left: "50%",
            bottom: 8,
            transform: "translateX(-50%)",
          }}
        >
          <span className="font-bold">{placedWords[hoveredIdx].keyword}</span>
          <span className="text-muted-foreground mx-2">|</span>
          <span className="text-muted-foreground">
            {placedWords[hoveredIdx].volume > 0
              ? `${placedWords[hoveredIdx].volume.toLocaleString()} 검색`
              : "검색량 미확인"}
          </span>
          <span className="text-muted-foreground mx-2">|</span>
          <span
            className={cn(
              "font-bold",
              placedWords[hoveredIdx].direction === "up"
                ? "text-rose-500"
                : placedWords[hoveredIdx].direction === "down"
                  ? "text-blue-500"
                  : "text-muted-foreground"
            )}
          >
            {placedWords[hoveredIdx].changeRate > 0 ? "+" : ""}
            {placedWords[hoveredIdx].changeRate}%
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function TrendsPage() {
  // Primary keyword
  const [primaryKeyword, setPrimaryKeyword] = useState("");
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Comparison keywords
  const [compareKeywords, setCompareKeywords] = useState<string[]>([]);
  const [compareInput, setCompareInput] = useState("");
  const compareRef = useRef<HTMLInputElement>(null);
  const [showCompare, setShowCompare] = useState(false);

  // Period
  const [months, setMonths] = useState(12);

  // Data state
  const [trends, setTrends] = useState<TrendResult[]>([]);
  const [demographics, setDemographics] = useState<DemographicData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Upgrade modal
  const [upgradeModal, setUpgradeModal] = useState<{
    open: boolean;
    feature?: string;
    used?: number;
    limit?: number;
  }>({ open: false });

  function handlePrimarySearch() {
    const kw = inputValue.trim();
    if (!kw) return;
    setPrimaryKeyword(kw);
    setInputValue("");
    // Auto-fetch
    fetchTrends(kw, compareKeywords, months);
  }

  function addCompareKeyword() {
    const kw = compareInput.trim();
    if (!kw || compareKeywords.includes(kw) || kw === primaryKeyword || compareKeywords.length >= 4) return;
    const newCompare = [...compareKeywords, kw];
    setCompareKeywords(newCompare);
    setCompareInput("");
    compareRef.current?.focus();
    if (primaryKeyword) {
      fetchTrends(primaryKeyword, newCompare, months);
    }
  }

  function removeCompareKeyword(kw: string) {
    const newCompare = compareKeywords.filter((k) => k !== kw);
    setCompareKeywords(newCompare);
    if (primaryKeyword) {
      fetchTrends(primaryKeyword, newCompare, months);
    }
  }

  function handlePeriodChange(newMonths: number) {
    setMonths(newMonths);
    if (primaryKeyword) {
      fetchTrends(primaryKeyword, compareKeywords, newMonths);
    }
  }

  const fetchTrends = useCallback(
    async (primary: string, compare: string[], period: number) => {
      const keywords = [primary, ...compare];
      setLoading(true);
      setError(null);

      try {
        // Fetch main trend data
        const res = await fetch("/api/trends", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keywords, months: period }),
        });

        if (res.status === 429) {
          const data = await res.json().catch(() => ({}));
          setUpgradeModal({
            open: true,
            feature: "트렌드 분석",
            used: data.used,
            limit: data.limit,
          });
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }

        const data = await res.json();
        setTrends(data.trends ?? []);
        setHasFetched(true);

        // Fetch demographics for the primary keyword (gender/age/device)
        await fetchDemographics(primary, period);
      } catch (err) {
        setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  async function fetchDemographics(keyword: string, period: number) {
    try {
      // Gender split
      const [maleRes, femaleRes, pcRes, moRes] = await Promise.all([
        fetch("/api/trends", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keywords: [keyword], months: period, gender: "m" }),
        }),
        fetch("/api/trends", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keywords: [keyword], months: period, gender: "f" }),
        }),
        fetch("/api/trends", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keywords: [keyword], months: period, device: "pc" }),
        }),
        fetch("/api/trends", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keywords: [keyword], months: period, device: "mo" }),
        }),
      ]);

      const [maleData, femaleData, pcData, moData] = await Promise.all([
        maleRes.ok ? maleRes.json() : null,
        femaleRes.ok ? femaleRes.json() : null,
        pcRes.ok ? pcRes.json() : null,
        moRes.ok ? moRes.json() : null,
      ]);

      // Calculate average ratios for gender
      const avgRatio = (trends: TrendResult[] | undefined): number => {
        if (!trends?.[0]?.data?.length) return 0;
        const sum = trends[0].data.reduce((acc, d) => acc + d.ratio, 0);
        return sum / trends[0].data.length;
      };

      const maleAvg = avgRatio(maleData?.trends);
      const femaleAvg = avgRatio(femaleData?.trends);
      const pcAvg = avgRatio(pcData?.trends);
      const moAvg = avgRatio(moData?.trends);

      // Age demographics — fetch all age groups in parallel
      const ageResults = await Promise.all(
        AGE_GROUPS.map(async (ag) => {
          try {
            const ageRes = await fetch("/api/trends", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                keywords: [keyword],
                months: period,
                ages: ag.values,
              }),
            });
            if (ageRes.ok) {
              const ageData = await ageRes.json();
              return { group: ag.label, ratio: avgRatio(ageData?.trends) };
            }
            return { group: ag.label, ratio: 0 };
          } catch {
            return { group: ag.label, ratio: 0 };
          }
        })
      );

      // Normalize age ratios to percentages
      const totalAge = ageResults.reduce((sum, a) => sum + a.ratio, 0) || 1;
      const normalizedAge = ageResults.map((a) => ({
        group: a.group,
        ratio: (a.ratio / totalAge) * 100,
      }));

      setDemographics({
        gender: { male: maleAvg, female: femaleAvg },
        age: normalizedAge,
        device: { pc: pcAvg, mobile: moAvg },
      });
    } catch {
      // Demographics are supplementary — don't fail the whole page
      setDemographics(null);
    }
  }

  function clearAll() {
    setPrimaryKeyword("");
    setCompareKeywords([]);
    setTrends([]);
    setDemographics(null);
    setHasFetched(false);
    setShowCompare(false);
    setError(null);
    inputRef.current?.focus();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={<TrendingUp className="size-8 text-primary" />}
        title="키워드 트렌드"
        description="네이버 DataLab 기반 키워드 검색 트렌드 분석 · 인구통계 · 기기별 비교"
      />

      {/* Search Section — subtle primary border on focus-within */}
      <div className="bg-card border border-muted/50 rounded-2xl p-6 shadow-sm space-y-4 transition-colors focus-within:border-primary/30">
        {/* Primary keyword input */}
        <div>
          <label className="text-sm font-semibold text-foreground/80 mb-2 block">
            키워드 입력
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handlePrimarySearch();
                  }
                }}
                placeholder="분석할 키워드를 입력하세요..."
                className="w-full pl-10 pr-4 py-3 bg-background border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
              />
            </div>
            <button
              type="button"
              onClick={handlePrimarySearch}
              disabled={!inputValue.trim() || loading}
              className="px-6 py-3 bg-foreground text-background rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              분석
            </button>
          </div>
        </div>

        {/* Active primary keyword + compare toggle */}
        {primaryKeyword && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold text-white bg-blue-500">
              {primaryKeyword}
              <button
                type="button"
                onClick={clearAll}
                className="hover:opacity-70"
                aria-label="초기화"
              >
                <X className="size-3" />
              </button>
            </span>

            {!showCompare && (
              <button
                type="button"
                onClick={() => setShowCompare(true)}
                className="text-sm text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 transition-colors"
              >
                <Plus className="size-3.5" />
                비교 키워드 추가
              </button>
            )}

            {/* Compare keyword chips */}
            {compareKeywords.map((kw, i) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: COLORS[(i + 1) % COLORS.length] }}
              >
                {kw}
                <button
                  type="button"
                  onClick={() => removeCompareKeyword(kw)}
                  className="hover:opacity-70"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Compare keyword input */}
        {showCompare && primaryKeyword && compareKeywords.length < 4 && (
          <div className="flex gap-2">
            <input
              ref={compareRef}
              type="text"
              value={compareInput}
              onChange={(e) => setCompareInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  addCompareKeyword();
                }
              }}
              placeholder="비교할 키워드 입력 (최대 4개)..."
              className="flex-1 px-4 py-2.5 bg-background border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={addCompareKeyword}
              disabled={!compareInput.trim()}
              className="px-4 py-2.5 bg-muted/50 text-foreground rounded-xl text-sm font-semibold flex items-center gap-1.5 hover:bg-muted/80 transition-colors disabled:opacity-40"
            >
              <Plus className="size-4" />
              추가
            </button>
          </div>
        )}

        {/* Period selector */}
        {primaryKeyword && (
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium mr-1">기간</span>
            {PERIOD_OPTIONS.map((opt) => (
              <PeriodPill
                key={opt.value}
                active={months === opt.value}
                onClick={() => handlePeriodChange(opt.value)}
              >
                {opt.label}
              </PeriodPill>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 px-5 py-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {hasFetched && !loading && (
        <div className="space-y-6">
          {/* Trend Chart — PRIMARY card: bigger shadow, subtle primary border */}
          <div className="bg-card border border-primary/10 rounded-2xl p-8 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <BarChart3 className="size-5 text-blue-500" />
                검색 트렌드
              </h3>
              <span className="text-xs text-muted-foreground">
                상대적 검색 관심도 (0-100)
              </span>
            </div>
            <TrendLineChart trends={trends} />
          </div>

          {/* Demographics Section — lighter weight cards */}
          {demographics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Gender */}
              <div className="bg-card border border-muted/30 rounded-2xl p-6">
                <h3 className="text-base font-bold flex items-center gap-2 mb-5">
                  <Users className="size-4 text-pink-500" />
                  성별 분포
                </h3>
                <GenderChart data={demographics.gender} />
              </div>

              {/* Age */}
              <div className="bg-card border border-muted/30 rounded-2xl p-6">
                <h3 className="text-base font-bold flex items-center gap-2 mb-5">
                  <PieChart className="size-4 text-purple-500" />
                  연령대 분포
                </h3>
                <AgeChart data={demographics.age} />
              </div>

              {/* Device */}
              <div className="bg-card border border-muted/30 rounded-2xl p-6">
                <h3 className="text-base font-bold flex items-center gap-2 mb-5">
                  <Smartphone className="size-4 text-emerald-500" />
                  기기별 비율
                </h3>
                <DeviceChart data={demographics.device} />
              </div>
            </div>
          )}

          {/* Loading demographics indicator */}
          {!demographics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-card border border-muted/30 rounded-2xl p-6 flex items-center justify-center h-48"
                >
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-5 animate-spin" />
                    <span className="text-xs">인구통계 로딩중...</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasFetched && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
            <TrendingUp className="size-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-bold text-foreground/70 mb-2">
            키워드를 검색하세요
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            키워드를 입력하면 네이버 DataLab 데이터를 기반으로
            <br />
            검색 트렌드, 성별·연령대·기기별 분포를 분석합니다.
          </p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <span className="text-sm font-medium text-muted-foreground">
            트렌드 데이터를 불러오는 중...
          </span>
        </div>
      )}

      {/* ================================================================= */}
      {/* Trending / New / Seasonal Sections — always visible             */}
      {/* ================================================================= */}

      <TrendingSectionWrapper />
      <DiscoverySectionWrapper />

      {/* Upgrade modal */}
      <UpgradeModal
        isOpen={upgradeModal.open}
        onClose={() => setUpgradeModal({ open: false })}
        feature={upgradeModal.feature ?? "트렌드 분석"}
        used={upgradeModal.used ?? 0}
        limit={upgradeModal.limit ?? 0}
      />
    </div>
  );
}

// ===========================================================================
// Trending Keywords Section — WordCloud + Ranked List (side by side)
// ===========================================================================

type TrendingSort = "changeRate" | "volume";
type TrendingOrder = "desc" | "asc";
type TrendingView = "cloud" | "table";

interface TrendingKw {
  keyword: string;
  volume: number;
  changeRate: number;
  direction: "up" | "down" | "stable";
}

function TrendingSectionWrapper() {
  const [period, setPeriod] = useState<"daily" | "monthly">("daily");
  const [sort, setSort] = useState<TrendingSort>("changeRate");
  const [order, setOrder] = useState<TrendingOrder>("desc");
  const [view, setView] = useState<TrendingView>("cloud");

  const { data, isLoading } = useQuery<{ period: string; keywords: TrendingKw[] }>({
    queryKey: ["trending-keywords", period],
    queryFn: async () => {
      const res = await fetch(`/api/keywords/trending?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch trending keywords");
      return res.json();
    },
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
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Flame className="size-5 text-orange-500" />
          인기 급상승 키워드
        </h3>
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
                <span className="flex-1 text-sm font-semibold truncate">{kw.keyword}</span>
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
// Discovery Section — Tabbed container: New Keywords | Seasonal Keywords
// ===========================================================================

type DiscoveryTab = "new" | "seasonal";

function DiscoverySectionWrapper() {
  const [activeTab, setActiveTab] = useState<DiscoveryTab>("new");

  return (
    <div className="bg-card border border-muted/50 rounded-2xl shadow-sm overflow-hidden">
      {/* Tab header */}
      <div className="flex border-b border-muted/30">
        <button
          type="button"
          onClick={() => setActiveTab("new")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold transition-colors",
            activeTab === "new"
              ? "text-foreground border-b-2 border-primary bg-primary/5"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
          )}
        >
          <Sparkles className="size-4" />
          새 키워드
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("seasonal")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold transition-colors",
            activeTab === "seasonal"
              ? "text-foreground border-b-2 border-primary bg-primary/5"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
          )}
        >
          <CalendarDays className="size-4" />
          시즌 키워드
        </button>
      </div>

      {/* Tab content */}
      <div className="p-6">
        {activeTab === "new" ? <NewKeywordsContent /> : <SeasonalKeywordsContent />}
      </div>
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
