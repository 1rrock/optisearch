"use client";

import { useEffect, useMemo, useState } from "react";

import { cn } from "@/shared/lib/utils";

export interface TrendingWordCloudItem {
  keyword: string;
  volume: number;
  changeRate: number;
  estimatedDelta: number;
  direction: "up" | "down" | "stable";
  newsTitle?: string | null;
  newsLink?: string | null;
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
  newsTitle?: string | null;
  newsLink?: string | null;
}

function getWordColor(direction: "up" | "down" | "stable", changeRate: number): string {
  if (direction === "up") {
    const intensity = Math.min(Math.abs(changeRate) / 100, 1);
    if (intensity > 0.6) return "#e11d48";
    if (intensity > 0.3) return "#ea580c";
    return "#d97706";
  }
  if (direction === "down") {
    const intensity = Math.min(Math.abs(changeRate) / 100, 1);
    if (intensity > 0.6) return "#2563eb";
    if (intensity > 0.3) return "#0891b2";
    return "#0d9488";
  }
  return "#6b7280";
}

function getWordColorDark(direction: "up" | "down" | "stable", changeRate: number): string {
  if (direction === "up") {
    const intensity = Math.min(Math.abs(changeRate) / 100, 1);
    if (intensity > 0.6) return "#fb7185";
    if (intensity > 0.3) return "#fb923c";
    return "#fbbf24";
  }
  if (direction === "down") {
    const intensity = Math.min(Math.abs(changeRate) / 100, 1);
    if (intensity > 0.6) return "#60a5fa";
    if (intensity > 0.3) return "#22d3ee";
    return "#2dd4bf";
  }
  return "#9ca3af";
}

let measureCanvas: HTMLCanvasElement | null = null;
function getMeasureCanvas(): HTMLCanvasElement {
  if (!measureCanvas) {
    measureCanvas = document.createElement("canvas");
    measureCanvas.width = 1;
    measureCanvas.height = 1;
  }
  return measureCanvas;
}

export function TrendingWordCloud({ keywords }: { keywords: TrendingWordCloudItem[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const sortedKeywords = useMemo(
    () => [...keywords].sort((a, b) => Math.abs(b.changeRate) - Math.abs(a.changeRate)),
    [keywords]
  );

  const rateRange = useMemo(() => {
    const absoluteRates = sortedKeywords.map((k) => Math.abs(k.changeRate));
    const maxRate = Math.max(...absoluteRates, 1);
    const minRate = Math.min(...absoluteRates, 0);
    return { minRate, range: maxRate - minRate || 1 };
  }, [sortedKeywords]);

  const placedWords = useMemo(() => {
    if (!mounted || sortedKeywords.length === 0) return [];

    const ctx = getMeasureCanvas().getContext("2d");
    if (!ctx) return [];

    const MIN_FONT = 14;
    const MAX_FONT = 48;

    const placed: PlacedWord[] = [];
    const rects: { x: number; y: number; w: number; h: number }[] = [];

    function collides(nx: number, ny: number, nw: number, nh: number): boolean {
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

    for (const kw of sortedKeywords) {
      const normalized = (Math.abs(kw.changeRate) - rateRange.minRate) / rateRange.range;
      const fontSize = Math.round(MIN_FONT + normalized * (MAX_FONT - MIN_FONT));

      ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
      const metrics = ctx.measureText(kw.keyword);
      const textWidth = metrics.width * 1.15;
      const textHeight = fontSize * 1.3;

      const a = 2.5;
      const tStep = 0.25;
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
        newsTitle: kw.newsTitle,
        newsLink: kw.newsLink,
      });

      rects.push({ x: px, y: py, w: textWidth, h: textHeight });
    }

    return placed;
  }, [sortedKeywords, isDark, mounted, rateRange.minRate, rateRange.range]);

  const viewBox = useMemo(() => {
    if (placedWords.length === 0) return { x: -200, y: -100, w: 400, h: 200 };

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const w of placedWords) {
      minX = Math.min(minX, w.x);
      minY = Math.min(minY, w.y);
      maxX = Math.max(maxX, w.x + w.width);
      maxY = Math.max(maxY, w.y + w.height);
    }

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
              onClick={() => window.open(`/analyze?keyword=${encodeURIComponent(word.keyword)}`, "_blank")}
            >
              {word.keyword}
            </text>
            <rect
              x={word.x}
              y={word.y}
              width={word.width}
              height={word.height}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => window.open(`/analyze?keyword=${encodeURIComponent(word.keyword)}`, "_blank")}
            />
          </g>
        ))}
      </svg>

      {hoveredIdx !== null && placedWords[hoveredIdx] && (
        <div
          className="absolute pointer-events-none z-10 bg-card border border-muted/50 shadow-lg rounded-lg px-3 py-2 text-xs max-w-xs"
          style={{
            left: "50%",
            bottom: 8,
            transform: "translateX(-50%)",
          }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold">{placedWords[hoveredIdx].keyword}</span>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground">
              {placedWords[hoveredIdx].volume > 0
                ? `${placedWords[hoveredIdx].volume.toLocaleString()} 검색`
                : "검색량 미확인"}
            </span>
            <span className="text-muted-foreground">|</span>
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
          {placedWords[hoveredIdx].newsTitle && (
            <div className="mt-1.5 pt-1.5 border-t border-muted/30 text-muted-foreground truncate">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-orange-500 dark:text-orange-400 mr-1.5">NEWS</span>
              {placedWords[hoveredIdx].newsTitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
