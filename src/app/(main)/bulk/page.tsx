"use client";

import { useState, useMemo, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Database,
  Upload,
  Download,
  Search,
  ArrowUpDown,
  Sparkles,
  Info,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  ArrowRightLeft,
} from "lucide-react";
import { copyToClipboard, formatKeywordsAsTags } from "@/shared/lib/clipboard";
import { parseKeywordsFromFile, exportToExcel } from "@/shared/lib/excel";
import { Button } from "@/shared/ui/button";
import { SavedKeywordsPopover } from "@/shared/ui/saved-keywords-popover";
import { PageHeader } from "@/shared/ui/page-header";
import type { KeywordSearchResult, KeywordGrade } from "@/entities/keyword/model/types";
import { getKeywordGradeConfig } from "@/shared/config/constants";
import { formatNumber, competitionBadgeClass } from "@/shared/lib/keyword-utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortKey = "pcSearchVolume" | "mobileSearchVolume" | "totalSearchVolume" | "keywordGrade";
type SortDir = "asc" | "desc";

const GRADE_ORDER: KeywordGrade[] = [
  "S+", "S", "S-", "A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-",
];

const PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseKeywords(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of raw.split("\n")) {
    const kw = line.trim();
    if (kw && !seen.has(kw)) {
      seen.add(kw);
      result.push(kw);
      if (result.length >= 50) break;
    }
  }
  return result;
}

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Inner Page (uses useSearchParams)
// ---------------------------------------------------------------------------

function BulkAnalysisPageInner() {
  const searchParams = useSearchParams();
  const [inputText, setInputText] = useState("");
  const [csvParsedCount, setCsvParsedCount] = useState<number | null>(null);
  const [results, setResults] = useState<KeywordSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("totalSearchVolume");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [bulkTagsCopied, setBulkTagsCopied] = useState(false);

  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  const keywords = useMemo(() => parseKeywords(inputText), [inputText]);

  // Populate from URL ?keywords=a,b,c
  useEffect(() => {
    const kw = searchParams.get("keywords");
    if (kw) {
      const kwList = kw.split(",").map(k => decodeURIComponent(k.trim())).filter(Boolean);
      if (kwList.length > 0) {
        setInputText(kwList.join("\n"));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Sort + filter
  const filtered = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    const list = q ? results.filter((r) => r.keyword.toLowerCase().includes(q)) : results;

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "keywordGrade") {
        cmp = GRADE_ORDER.indexOf(a.keywordGrade) - GRADE_ORDER.indexOf(b.keywordGrade);
      } else {
        cmp = a[sortKey] - b[sortKey];
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [results, filterQuery, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  }

  async function handleCopyAllTags() {
    const allKeywords = results.map((r) => r.keyword);
    const text = formatKeywordsAsTags(allKeywords);
    const ok = await copyToClipboard(text);
    if (ok) {
      setBulkTagsCopied(true);
      setTimeout(() => setBulkTagsCopied(false), 2000);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const parsedKeywords = parseKeywordsFromFile(buffer, file.name);
    const limited = parsedKeywords.slice(0, 50);
    setInputText(limited.join("\n"));
    setCsvParsedCount(limited.length);
    // Reset so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleExportExcel() {
    const data = results.map((r) => ({
      키워드: r.keyword,
      PC검색량: r.pcSearchVolume,
      모바일검색량: r.mobileSearchVolume,
      총검색량: r.totalSearchVolume,
      경쟁도: r.competition,
      포화지수: r.saturationIndex.label,
      등급: r.keywordGrade,
    }));
    exportToExcel(data, `키워드분석_${new Date().toISOString().slice(0, 10)}`);
  }

  async function handleAnalyze() {
    if (keywords.length === 0 || loading) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setPage(1);
    setProgress({ done: 0, total: keywords.length });

    try {
      const res = await fetch("/api/keywords/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).error ?? `HTTP ${res.status}`);
      }

      const data = await res.json() as { results: KeywordSearchResult[] };
      setResults(data.results);
      setProgress({ done: data.results.length, total: keywords.length });
    } catch (err) {
      setError(err instanceof Error ? err.message : "분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const SortIcon = ({ col }: { col: SortKey }) => (
    <ArrowUpDown
      className={`size-3 transition-colors ${sortKey === col ? "text-primary" : ""}`}
    />
  );

  return (
    <div className="space-y-8">

      {/* 1. Page Header */}
      <PageHeader
        icon={<Database className="size-8 text-primary" />}
        title="대량 키워드 분석"
        description="한 번에 최대 50개의 키워드를 심층 분석하고 인사이트를 도출합니다."
      />

      {/* 2. Input Section */}
      <section className="bg-card rounded-2xl shadow-sm border border-muted/50 overflow-hidden">
        <div className="p-6 space-y-4">
          {/* Action buttons row */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-foreground">키워드 입력</label>
            <div className="flex items-center gap-2">
              {/* CSV Upload button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-muted/60 bg-muted/20 text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:bg-muted/40 transition-colors"
              >
                <Upload className="size-3.5" />
                CSV 업로드
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
              {/* Saved keywords popover */}
              <SavedKeywordsPopover
                mode="multi"
                onAdd={(kws) => {
                  setInputText(prev => {
                    const existing = prev.trim();
                    if (!existing) return kws.join("\n");
                    return existing + "\n" + kws.join("\n");
                  });
                }}
                triggerLabel="저장된 키워드"
              />
            </div>
          </div>

          {/* Textarea - always visible */}
          <textarea
            className="w-full h-48 p-4 bg-muted/20 rounded-xl border border-muted/50 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 text-foreground resize-none font-mono text-sm transition-all"
            placeholder={`분석할 키워드를 줄바꿈(Enter)으로 구분하여 입력하세요 (최대 50개)\n예시:\n여름 원피스\n제주도 여행\n단백질 쉐이크`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />

          {/* Footer: count + analyze button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg">
              <Info className="size-4 text-blue-500 shrink-0" />
              <span>현재 {keywords.length}개 / 최대 50개</span>
              {csvParsedCount !== null && (
                <span className="ml-2 text-emerald-600 font-medium">
                  (파일에서 {csvParsedCount}개 불러옴)
                </span>
              )}
            </div>
            <Button
              size="lg"
              className="px-10 rounded-xl font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform flex items-center gap-2"
              onClick={handleAnalyze}
              disabled={loading || keywords.length === 0}
            >
              {loading && progress ? (
                <>
                  <span className="animate-spin size-5 border-2 border-white border-t-transparent rounded-full" />
                  분석 중... {progress.done}/{progress.total}
                </>
              ) : (
                <>
                  <Search className="size-5" />
                  분석 시작
                </>
              )}
            </Button>
          </div>
          {error && (
            <p className="text-sm text-rose-500 font-medium">{error}</p>
          )}
        </div>
      </section>

      {/* 3. Results Section */}
      {results.length > 0 && (
        <section className="space-y-6">
          {/* Results Header / Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-muted/20 rounded-2xl border border-muted/30">
            <div className="relative md:w-80 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-muted/50 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                placeholder="분석 결과 내 키워드 검색..."
                type="text"
                value={filterQuery}
                onChange={(e) => { setFilterQuery(e.target.value); setPage(1); }}
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                className="rounded-xl font-semibold text-xs sm:text-sm"
                onClick={handleCopyAllTags}
                disabled={results.length === 0}
              >
                {bulkTagsCopied ? (
                  <>
                    <Check className="size-4 mr-1.5 text-emerald-500" />
                    <span className="text-emerald-600">복사 완료!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-4 mr-1.5" />
                    태그 복사
                  </>
                )}
              </Button>
              <a
                href={selectedRows.size >= 2 ? `/compare?keywords=${Array.from(selectedRows).slice(0, 5).map(k => encodeURIComponent(k)).join(",")}` : "#"}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border transition-colors ${
                  selectedRows.size >= 2
                    ? "bg-violet-100 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800 hover:bg-violet-200"
                    : "bg-muted/50 text-muted-foreground border-muted/50 cursor-not-allowed pointer-events-none"
                }`}
              >
                <ArrowRightLeft className="size-4" />
                <span className="hidden sm:inline">선택</span> 비교 {selectedRows.size > 0 ? `(${Math.min(selectedRows.size, 5)})` : ""}
              </a>
              <Button
                variant="outline"
                className="rounded-xl font-semibold text-xs sm:text-sm"
                onClick={handleExportExcel}
                disabled={results.length === 0}
              >
                <Download className="size-4 mr-1.5" />
                엑셀
              </Button>
              <a
                href={selectedRows.size >= 1 ? `/ai?keyword=${encodeURIComponent(Array.from(selectedRows)[0])}&tab=title` : "#"}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors ${
                  selectedRows.size >= 1
                    ? "bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 hover:bg-purple-200"
                    : "bg-muted/50 text-muted-foreground cursor-not-allowed pointer-events-none"
                }`}
              >
                <Sparkles className="size-4" />
                <span className="hidden sm:inline">AI 제목</span><span className="sm:hidden">AI</span>
              </a>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-card rounded-2xl shadow-sm border border-muted/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/20 border-b border-muted/30 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="p-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={selectedRows.size === paginated.length && paginated.length > 0}
                        onChange={() => {
                          if (selectedRows.size === paginated.length) {
                            setSelectedRows(new Set());
                          } else {
                            setSelectedRows(new Set(paginated.map(r => r.keyword)));
                          }
                        }}
                        className="size-4 rounded border-muted-foreground/30 text-primary focus:ring-primary/30"
                      />
                    </th>
                    <th className="p-4 w-16 text-center">#</th>
                    <th className="p-4 min-w-[150px]">키워드</th>
                    <th
                      className="p-4 cursor-pointer hover:bg-muted/40 transition-colors whitespace-nowrap"
                      onClick={() => handleSort("pcSearchVolume")}
                    >
                      <div className="flex items-center gap-1">PC 검색량 <SortIcon col="pcSearchVolume" /></div>
                    </th>
                    <th
                      className="p-4 cursor-pointer hover:bg-muted/40 transition-colors whitespace-nowrap"
                      onClick={() => handleSort("mobileSearchVolume")}
                    >
                      <div className="flex items-center gap-1">모바일 검색량 <SortIcon col="mobileSearchVolume" /></div>
                    </th>
                    <th
                      className="p-4 cursor-pointer hover:bg-muted/40 transition-colors whitespace-nowrap text-right pr-8"
                      onClick={() => handleSort("totalSearchVolume")}
                    >
                      <div className="flex items-center gap-1 justify-end">총 검색량 <SortIcon col="totalSearchVolume" /></div>
                    </th>
                    <th className="p-4 text-center">경쟁도</th>
                    <th className="p-4 text-right pr-8">클릭률(CTR)</th>
                    <th
                      className="p-4 cursor-pointer hover:bg-muted/40 transition-colors text-center whitespace-nowrap"
                      onClick={() => handleSort("keywordGrade")}
                    >
                      <div className="flex items-center gap-1 justify-center">키워드 등급 <SortIcon col="keywordGrade" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted/30">
                  {paginated.map((row, idx) => {
                    const gradeConfig = getKeywordGradeConfig(row.keywordGrade);
                    const globalIdx = (page - 1) * PAGE_SIZE + idx + 1;
                    return (
                      <tr key={row.keyword} className="hover:bg-muted/20 transition-colors group cursor-pointer">
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedRows.has(row.keyword)}
                            onChange={() => {
                              setSelectedRows(prev => {
                                const next = new Set(prev);
                                if (next.has(row.keyword)) next.delete(row.keyword);
                                else next.add(row.keyword);
                                return next;
                              });
                            }}
                            className="size-4 rounded border-muted-foreground/30 text-primary focus:ring-primary/30"
                          />
                        </td>
                        <td className="p-4 text-center text-sm font-mono text-muted-foreground/80">
                          {String(globalIdx).padStart(2, "0")}
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-foreground/90 border-b border-transparent group-hover:border-primary/50 transition-colors">
                            {row.keyword}
                          </span>
                        </td>
                        <td className="p-4 text-sm font-medium text-foreground/70">
                          {formatNumber(row.pcSearchVolume)}
                        </td>
                        <td className="p-4 text-sm font-medium text-foreground/70">
                          {formatNumber(row.mobileSearchVolume)}
                        </td>
                        <td className="p-4 text-right pr-8">
                          <span className="px-3 py-1 text-sm font-bold rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/30">
                            {formatNumber(row.totalSearchVolume)}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${competitionBadgeClass(row.competition)}`}>
                            {row.competition}
                          </span>
                        </td>
                        <td className="p-4 text-sm font-bold text-muted-foreground/80 text-right pr-8">
                          {formatPct(row.clickRate)}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className="text-base font-black"
                            style={{ color: gradeConfig.color }}
                          >
                            {row.keywordGrade}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-2 pt-2 pb-8">
            <p className="text-sm font-semibold text-muted-foreground">
              총 {filtered.length}개 분석 결과 중 {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)}개 표시
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="size-9 rounded-lg border-muted"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "...")[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">...</span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === page ? "default" : "ghost"}
                      className="size-9 rounded-lg font-medium hover:bg-muted/50"
                      onClick={() => setPage(p as number)}
                    >
                      {p}
                    </Button>
                  )
                )}
              <Button
                variant="outline"
                size="icon"
                className="size-9 rounded-lg border-muted"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (Suspense wrapper for useSearchParams)
// ---------------------------------------------------------------------------

export default function BulkAnalysisPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24 text-muted-foreground">로딩 중...</div>}>
      <BulkAnalysisPageInner />
    </Suspense>
  );
}
