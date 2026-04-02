"use client";

import { useState, useRef } from "react";
import {
  LineChart,
  Target,
  BarChart3,
  Search,
  CheckCircle2,
  Plus,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import type { TrendResult, TrendPoint } from "@/services/trend-service";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444"];

const AGE_OPTIONS: { label: string; value: string[] }[] = [
  { label: "10대", value: ["1", "2"] },
  { label: "20대", value: ["3", "4"] },
  { label: "30대", value: ["5", "6"] },
  { label: "40대", value: ["7", "8"] },
  { label: "50대", value: ["9", "10"] },
  { label: "60대+", value: ["11"] },
];

// ---------------------------------------------------------------------------
// SVG Line Chart
// ---------------------------------------------------------------------------

function TrendChart({ trends }: { trends: TrendResult[] }) {
  if (trends.length === 0 || trends.every((t) => t.data.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        데이터가 없습니다.
      </div>
    );
  }

  const W = 800;
  const H = 280;
  const PAD = { top: 16, right: 24, bottom: 48, left: 44 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Collect all periods across all trends, sorted
  const allPeriods = Array.from(
    new Set(trends.flatMap((t) => t.data.map((d) => d.period)))
  ).sort();

  if (allPeriods.length === 0) return null;

  const xStep = chartW / Math.max(allPeriods.length - 1, 1);

  const xOf = (period: string) => {
    const idx = allPeriods.indexOf(period);
    return PAD.left + idx * xStep;
  };

  const yOf = (ratio: number) =>
    PAD.top + chartH - (ratio / 100) * chartH;

  // Y-axis labels
  const yTicks = [0, 25, 50, 75, 100];

  // X-axis: show at most ~6 labels to avoid overlap
  const xTickStep = Math.max(1, Math.floor(allPeriods.length / 6));
  const xTicks = allPeriods.filter((_, i) => i % xTickStep === 0);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[420px]"
        style={{ height: H }}
        aria-label="트렌드 차트"
      >
        {/* Grid lines */}
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

        {/* Y-axis labels */}
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

        {/* X-axis labels */}
        {xTicks.map((period) => (
          <text
            key={period}
            x={xOf(period)}
            y={H - 8}
            textAnchor="middle"
            fontSize={10}
            fill="currentColor"
            fillOpacity={0.45}
          >
            {period.slice(0, 7)}
          </text>
        ))}

        {/* Lines */}
        {trends.map((trend, ti) => {
          const color = COLORS[ti % COLORS.length];
          const points = trend.data
            .filter((d) => allPeriods.includes(d.period))
            .sort((a, b) => a.period.localeCompare(b.period));

          if (points.length < 2) return null;

          const d = points
            .map((pt, i) =>
              `${i === 0 ? "M" : "L"} ${xOf(pt.period)} ${yOf(pt.ratio)}`
            )
            .join(" ");

          return (
            <path
              key={trend.keyword}
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {/* Dots at each data point */}
        {trends.map((trend, ti) => {
          const color = COLORS[ti % COLORS.length];
          return trend.data.map((pt) => (
            <circle
              key={`${trend.keyword}-${pt.period}`}
              cx={xOf(pt.period)}
              cy={yOf(pt.ratio)}
              r={3}
              fill={color}
            />
          ));
        })}
      </svg>

      {/* Legend */}
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter pill helpers
// ---------------------------------------------------------------------------

function FilterPill({
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
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
        active
          ? "bg-foreground text-background border-foreground"
          : "bg-card text-muted-foreground border-muted/50 hover:border-foreground/30 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function TrendsPage() {
  // Keyword input state
  const [keywords, setKeywords] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Demographics filters
  const [device, setDevice] = useState<"" | "pc" | "mo">("");
  const [gender, setGender] = useState<"" | "m" | "f">("");
  const [selectedAges, setSelectedAges] = useState<string[]>([]);

  // Trend data state
  const [trends, setTrends] = useState<TrendResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  function addKeyword() {
    const kw = inputValue.trim();
    if (!kw || keywords.includes(kw) || keywords.length >= 5) return;
    setKeywords((prev) => [...prev, kw]);
    setInputValue("");
    inputRef.current?.focus();
  }

  function removeKeyword(kw: string) {
    setKeywords((prev) => prev.filter((k) => k !== kw));
  }

  function toggleAge(ageValues: string[]) {
    const allPresent = ageValues.every((v) => selectedAges.includes(v));
    if (allPresent) {
      setSelectedAges((prev) => prev.filter((v) => !ageValues.includes(v)));
    } else {
      setSelectedAges((prev) => Array.from(new Set([...prev, ...ageValues])));
    }
  }

  function isAgeActive(ageValues: string[]) {
    return ageValues.every((v) => selectedAges.includes(v));
  }

  async function fetchTrends() {
    if (keywords.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { keywords, months: 12 };
      if (device) body.device = device;
      if (gender) body.gender = gender;
      if (selectedAges.length > 0) body.ages = selectedAges;

      const res = await fetch("/api/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      setTrends(data.trends ?? []);
      setHasFetched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <PageHeader
        icon={<LineChart className="size-8 text-primary" />}
        title="AI 트렌드 레이더"
        description="네이버 DataLab 검색 트렌드 데이터를 기반으로 키워드별 관심도 변화를 시각화합니다."
        className="mb-14"
      />

      {/* Phase 2 Notice: 급상승 키워드 */}
      <section>
        <div className="flex items-center gap-3 px-5 py-4 bg-muted/40 border border-muted/60 rounded-2xl text-sm text-muted-foreground">
          <AlertCircle className="size-4 shrink-0 text-amber-500" />
          <span>
            <strong className="text-foreground">급상승 키워드</strong> 기능은
            Phase 2에서 오픈 예정입니다{" "}
            <span className="opacity-70">(키워드 코퍼스 축적 후)</span>
          </span>
        </div>
      </section>

      {/* Keyword Trend Search */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <LineChart className="size-6 text-blue-500" />
          키워드 트렌드 비교
        </h2>

        {/* Keyword input */}
        <div className="bg-card border border-muted/50 rounded-2xl p-6 space-y-5 shadow-sm">
          <div>
            <label className="text-sm font-semibold text-foreground/80 mb-2 block">
              키워드 입력{" "}
              <span className="font-normal text-muted-foreground">
                (최대 5개)
              </span>
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addKeyword();
                  }
                }}
                placeholder="키워드 입력 후 Enter 또는 추가 버튼..."
                disabled={keywords.length >= 5}
                className="flex-1 px-4 py-2.5 bg-background border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={addKeyword}
                disabled={!inputValue.trim() || keywords.length >= 5}
                className="px-4 py-2.5 bg-foreground text-background rounded-xl text-sm font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                <Plus className="size-4" />
                추가
              </button>
            </div>

            {/* Keyword chips */}
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {keywords.map((kw, i) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  >
                    {kw}
                    <button
                      type="button"
                      onClick={() => removeKeyword(kw)}
                      className="hover:opacity-70 transition-opacity"
                      aria-label={`${kw} 삭제`}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Demographics filters */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground/80">
              인구통계 필터
            </p>

            {/* Device */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground w-12">기기</span>
              <FilterPill active={device === ""} onClick={() => setDevice("")}>
                전체
              </FilterPill>
              <FilterPill active={device === "pc"} onClick={() => setDevice("pc")}>
                PC
              </FilterPill>
              <FilterPill active={device === "mo"} onClick={() => setDevice("mo")}>
                모바일
              </FilterPill>
            </div>

            {/* Gender */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground w-12">성별</span>
              <FilterPill active={gender === ""} onClick={() => setGender("")}>
                전체
              </FilterPill>
              <FilterPill active={gender === "m"} onClick={() => setGender("m")}>
                남성
              </FilterPill>
              <FilterPill active={gender === "f"} onClick={() => setGender("f")}>
                여성
              </FilterPill>
            </div>

            {/* Age groups */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground w-12">연령</span>
              {AGE_OPTIONS.map((opt) => (
                <FilterPill
                  key={opt.label}
                  active={isAgeActive(opt.value)}
                  onClick={() => toggleAge(opt.value)}
                >
                  {opt.label}
                </FilterPill>
              ))}
            </div>
          </div>

          {/* Search button */}
          <button
            type="button"
            onClick={fetchTrends}
            disabled={keywords.length === 0 || loading}
            className="w-full py-3 bg-foreground text-background rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                데이터 불러오는 중...
              </>
            ) : (
              <>
                <Search className="size-4" />
                트렌드 조회
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 px-5 py-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Chart */}
        {hasFetched && !loading && (
          <div className="bg-card border border-muted/50 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-semibold mb-4">
              검색 관심도 추이 (최근 12개월)
            </h3>
            <TrendChart trends={trends} />
          </div>
        )}
      </section>

      {/* 콘텐츠 아이데이션 맵 (static, Phase 2 note) */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="size-6 text-blue-500" />
            콘텐츠 아이데이션 맵
          </h2>
          <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-3 py-1 rounded-md border border-muted/40">
            Phase 2에서 실시간 데이터 연결 예정
          </span>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar Topics */}
          <div className="w-full lg:w-56 shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0">
            <TopicTab label="🔥 요즘 뜨는 (Hot)" active />
            <TopicTab label="🌸 봄 시즌 (Spring)" />
            <TopicTab label="💻 IT / 테크" />
            <TopicTab label="💰 재테크 / 경제" />
            <TopicTab label="🏃 헬스케어" />
          </div>

          {/* Right Cards Grid */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            <OpportunityCard
              keyword="벚꽃 개화시기"
              volume="340k"
              growth="Target"
              desc="시즌성 트래픽 포식자. 내달 초까지 지속적인 유입 보장."
            />
            <OpportunityCard
              keyword="봄꽃 축제 일정"
              volume="89k"
              growth="Rising"
              desc="지역별 축제 정리 포스팅 시 상위 노출에 유리함."
            />
            <OpportunityCard
              keyword="환절기 피부관리"
              volume="45k"
              growth="Stable"
              desc="구매 전환율이 높은 상업적 가치가 뛰어난 키워드."
            />
            <OpportunityCard
              keyword="나들이 도시락"
              volume="28k"
              growth="Rising"
              desc="레시피 블로그에 강력 추천. 롱테일 키워드와 조합 요망."
            />
            <OpportunityCard
              keyword="근교 드라이브 코스"
              volume="112k"
              growth="Stable"
              desc="주말마다 폭발. 장소 큐레이션 형태의 글로 대응."
            />
            <OpportunityCard
              keyword="미세먼지 마스크"
              volume="210k"
              growth="Volatile"
              desc="날씨에 따른 변동성 큼. 실시간 이슈성 글로 추천."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TopicTab({ label, active }: { label: string; active?: boolean }) {
  return (
    <button
      className={`flex items-center justify-between px-5 py-3.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap lg:whitespace-normal text-left ${
        active
          ? "bg-foreground text-background shadow-md transform scale-[1.02]"
          : "bg-muted/30 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
      }`}
    >
      {label}
      {active && <CheckCircle2 className="size-4 hidden lg:block text-background/80" />}
    </button>
  );
}

function OpportunityCard({
  keyword,
  volume,
  growth,
  desc,
}: {
  keyword: string;
  volume: string;
  growth: string;
  desc: string;
}) {
  let badgeStyle = "";
  if (growth === "Target")
    badgeStyle =
      "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
  else if (growth === "Rising")
    badgeStyle =
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  else
    badgeStyle =
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400";

  return (
    <div className="p-5 bg-card border border-muted/50 rounded-2xl flex flex-col hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group">
      <div className="flex items-center justify-between mb-4">
        <span
          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${badgeStyle}`}
        >
          {growth}
        </span>
        <BarChart3 className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <h4 className="text-lg font-extrabold mb-1">{keyword}</h4>
      <p className="text-2xl font-black text-primary/80 mb-3">
        {volume}{" "}
        <span className="text-xs font-semibold text-muted-foreground font-sans">
          Vol/m
        </span>
      </p>
      <p className="text-xs text-muted-foreground mt-auto leading-relaxed border-t border-muted/30 pt-3">
        {desc}
      </p>
    </div>
  );
}
