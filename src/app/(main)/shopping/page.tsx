"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingBag, Search, Loader2, AlertCircle, TrendingUp, ChevronDown } from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { Popover, PopoverTrigger, PopoverContent } from "@/shared/ui/popover";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShoppingDataPoint {
  period: string;
  ratio: number;
}

interface ShoppingResult {
  title: string;
  data: ShoppingDataPoint[];
}

interface ShoppingResponse {
  results: ShoppingResult[];
}

interface SearchParams {
  category: string;
  keyword?: string;
  months: number;
  device?: "pc" | "mo";
  gender?: "m" | "f";
}

// ---------------------------------------------------------------------------
// Category Presets
// ---------------------------------------------------------------------------

const CATEGORY_PRESETS = [
  { code: "50000000", label: "패션의류" },
  { code: "50000001", label: "패션잡화" },
  { code: "50000002", label: "화장품/미용" },
  { code: "50000003", label: "디지털/가전" },
  { code: "50000004", label: "가구/인테리어" },
  { code: "50000005", label: "출산/육아" },
  { code: "50000006", label: "식품" },
  { code: "50000007", label: "스포츠/레저" },
  { code: "50000008", label: "생활/건강" },
  { code: "50000009", label: "여가/생활편의" },
  { code: "50000010", label: "면세점" },
  { code: "50000803", label: "도서" },
  { code: "50000804", label: "티켓/쿠폰" },
  { code: "50000805", label: "반려동물" },
  { code: "50000806", label: "자동차용품" },
  { code: "50005542", label: "키즈패션" },
];

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

async function fetchShopping(params: SearchParams): Promise<ShoppingResponse> {
  const body: Record<string, unknown> = {
    category: params.category,
    months: params.months,
  };
  if (params.keyword) body.keyword = params.keyword;
  if (params.device) body.device = params.device;
  if (params.gender) body.gender = params.gender;

  const res = await fetch("/api/shopping", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `오류 발생 (${res.status})`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// SVG Line Chart
// ---------------------------------------------------------------------------

function ShoppingChart({ data }: { data: ShoppingDataPoint[] }) {
  if (data.length === 0) {
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

  const sorted = [...data].sort((a, b) => a.period.localeCompare(b.period));
  const xStep = chartW / Math.max(sorted.length - 1, 1);

  const xOf = (i: number) => PAD.left + i * xStep;
  const yOf = (ratio: number) => PAD.top + chartH - (ratio / 100) * chartH;

  const yTicks = [0, 25, 50, 75, 100];
  const xTickStep = Math.max(1, Math.floor(sorted.length / 6));
  const pathD = sorted
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${xOf(i)} ${yOf(pt.ratio)}`)
    .join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[420px]"
        style={{ height: H }}
        aria-label="쇼핑 트렌드 차트"
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
        {sorted.map((pt, i) =>
          i % xTickStep === 0 ? (
            <text
              key={pt.period}
              x={xOf(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize={10}
              fill="currentColor"
              fillOpacity={0.45}
            >
              {pt.period.slice(0, 7)}
            </text>
          ) : null
        )}

        {/* Line */}
        {sorted.length >= 2 && (
          <path
            d={pathD}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Dots */}
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

// ---------------------------------------------------------------------------
// Filter Pill
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
// Loading Skeleton
// ---------------------------------------------------------------------------

function ChartSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 w-48 bg-muted rounded" />
      <div className="h-64 bg-muted/50 rounded-xl" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ShoppingInsightPage() {
  const [category, setCategory] = useState("");
  const [keyword, setKeyword] = useState("");
  const [months, setMonths] = useState(12);
  const [device, setDevice] = useState<"" | "pc" | "mo">("");
  const [gender, setGender] = useState<"" | "m" | "f">("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");

  const queryClient = useQueryClient();
  const { mutate, data, isPending, error, isIdle } = useMutation({
    mutationFn: fetchShopping,
    onSuccess: (result, params) => {
      const cacheKey = `${params.category}_${params.keyword ?? ""}_${params.months}_${params.device ?? ""}_${params.gender ?? ""}`;
      queryClient.setQueryData(["shopping", cacheKey], result);
    },
  });

  function handleSearch() {
    if (!category.trim()) return;
    const params: SearchParams = { category: category.trim(), months };
    if (keyword.trim()) params.keyword = keyword.trim();
    if (device) params.device = device;
    if (gender) params.gender = gender;
    mutate(params);
  }

  const filteredCategories = CATEGORY_PRESETS.filter(c =>
    c.label.toLowerCase().includes(categorySearch.toLowerCase()) ||
    c.code.includes(categorySearch)
  );

  const chartData = data?.results?.[0]?.data ?? [];
  const resultTitle = data?.results?.[0]?.title;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <PageHeader
        icon={<ShoppingBag className="size-8 text-primary" />}
        title="쇼핑 키워드 인사이트"
        description="네이버 쇼핑 카테고리별 검색 트렌드를 파악하세요."
      />

      {/* Search Form */}
      <div className="bg-card border border-muted/50 rounded-2xl p-6 space-y-5 shadow-sm">
        {/* Inputs row */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-foreground/80">
              카테고리 <span className="text-destructive">*</span>
            </label>
            <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full px-4 py-2.5 bg-popover border border-border rounded-xl text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <span className={category ? "text-foreground" : "text-muted-foreground"}>
                    {category
                      ? CATEGORY_PRESETS.find(c => c.code === category)?.label
                        ? `${CATEGORY_PRESETS.find(c => c.code === category)!.label} (${category})`
                        : category
                      : "카테고리 선택 또는 코드 입력"
                    }
                  </span>
                  <ChevronDown className={`size-4 text-muted-foreground transition-transform ${categoryOpen ? "rotate-180" : ""}`} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="p-0 rounded-xl" style={{ width: "var(--radix-popover-trigger-width)" }}>
                <div className="p-2 border-b border-muted/30">
                  <input
                    autoFocus
                    type="text"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder="카테고리명 또는 코드 검색..."
                    className="w-full px-3 py-2 text-sm bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto p-1">
                  {filteredCategories.map(c => (
                    <button
                      key={c.code}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                        category === c.code
                          ? "bg-primary/10 text-primary font-semibold"
                          : "hover:bg-accent"
                      }`}
                      onClick={() => {
                        setCategory(c.code);
                        setCategoryOpen(false);
                        setCategorySearch("");
                      }}
                    >
                      <span className="font-medium">{c.label}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{c.code}</span>
                    </button>
                  ))}
                  {filteredCategories.length === 0 && categorySearch.trim() && (
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-accent"
                      onClick={() => {
                        setCategory(categorySearch.trim());
                        setCategoryOpen(false);
                        setCategorySearch("");
                      }}
                    >
                      <span className="text-muted-foreground">직접 입력: </span>
                      <span className="font-medium">{categorySearch.trim()}</span>
                    </button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-foreground/80">
              키워드 <span className="text-muted-foreground font-normal">(선택)</span>
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              placeholder="예: 원피스"
              className="px-4 py-2.5 bg-background border border-muted/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground/80">필터</p>

          {/* Period */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground w-12">기간</span>
            {([1, 3, 6, 12] as const).map((m) => (
              <FilterPill key={m} active={months === m} onClick={() => setMonths(m)}>
                {m}개월
              </FilterPill>
            ))}
          </div>

          {/* Device */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground w-12">기기</span>
            <FilterPill active={device === ""} onClick={() => setDevice("")}>전체</FilterPill>
            <FilterPill active={device === "pc"} onClick={() => setDevice("pc")}>PC</FilterPill>
            <FilterPill active={device === "mo"} onClick={() => setDevice("mo")}>모바일</FilterPill>
          </div>

          {/* Gender */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground w-12">성별</span>
            <FilterPill active={gender === ""} onClick={() => setGender("")}>전체</FilterPill>
            <FilterPill active={gender === "m"} onClick={() => setGender("m")}>남성</FilterPill>
            <FilterPill active={gender === "f"} onClick={() => setGender("f")}>여성</FilterPill>
          </div>
        </div>

        {/* Search button */}
        <button
          type="button"
          onClick={handleSearch}
          disabled={!category.trim() || isPending}
          className="w-full py-3 bg-foreground text-background rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {isPending ? (
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
          {error instanceof Error ? error.message : "오류가 발생했습니다."}
        </div>
      )}

      {/* Loading skeleton */}
      {isPending && (
        <div className="bg-card border border-muted/50 rounded-2xl p-6 shadow-sm">
          <ChartSkeleton />
        </div>
      )}

      {/* Empty state */}
      {isIdle && (
        <div className="bg-card border border-muted/50 rounded-2xl p-12 shadow-sm flex flex-col items-center gap-4 text-center">
          <div className="size-16 rounded-2xl bg-muted/30 flex items-center justify-center">
            <ShoppingBag className="size-8 text-muted-foreground/40" />
          </div>
          <div>
            <p className="font-semibold text-foreground/70">카테고리를 선택하세요</p>
            <p className="text-sm text-muted-foreground mt-1">
              네이버 쇼핑 카테고리를 선택한 뒤 기간과 필터를 설정하고 조회하세요.
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {!isPending && data && (
        <div className="bg-card border border-muted/50 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-5 text-blue-500" />
            <h3 className="text-base font-semibold">
              {resultTitle ? `${resultTitle} — 클릭 트렌드` : "쇼핑 클릭 트렌드"}
            </h3>
            <span className="ml-auto text-xs text-muted-foreground">
              최근 {months}개월 · Y축: 상대 지수 (0-100)
            </span>
          </div>
          <ShoppingChart data={chartData} />
        </div>
      )}
    </div>
  );
}
