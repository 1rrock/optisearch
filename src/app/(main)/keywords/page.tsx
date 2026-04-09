"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Trash2, Search, Pencil, Check, X, ArrowRight, ArrowRightLeft, Database } from "lucide-react";

import { toast } from "sonner";
import { PageHeader } from "@/shared/ui/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SavedKeyword {
  id: string;
  keyword: string;
  memo: string | null;
  createdAt: string;
}

interface SavedKeywordsResponse {
  keywords: SavedKeyword[];
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function fetchSavedKeywords(): Promise<SavedKeywordsResponse> {
  const res = await fetch("/api/keywords/saved", { cache: "no-store" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `불러오기 실패 (${res.status})`);
  }
  return res.json();
}

async function updateMemo(keyword: string, memo: string): Promise<void> {
  const res = await fetch("/api/keywords/saved", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword, memo }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `저장 실패 (${res.status})`);
  }
}

async function deleteKeyword(keyword: string): Promise<void> {
  const res = await fetch("/api/keywords/saved", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `삭제 실패 (${res.status})`);
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="size-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
        <Bookmark className="size-10 text-muted-foreground/50" />
      </div>
      <h3 className="text-xl font-bold text-foreground/80 mb-2">저장된 키워드가 없습니다</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        키워드 분석 페이지에서 별표 버튼을 눌러 관심 키워드를 저장하세요.
      </p>
    </div>
  );
}

function KeywordCard({
  item,
  onDelete,
  onMemoSave,
  isSelected,
  onToggleSelect,
}: {
  item: SavedKeyword;
  onDelete: (keyword: string) => void;
  onMemoSave: (keyword: string, memo: string) => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [memoValue, setMemoValue] = useState(item.memo ?? "");

  const formattedDate = new Date(item.createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  function handleSave() {
    onMemoSave(item.keyword, memoValue);
    setEditing(false);
  }

  function handleCancel() {
    setMemoValue(item.memo ?? "");
    setEditing(false);
  }

  function handleAnalyze() {
    window.open(`/analyze?keyword=${encodeURIComponent(item.keyword)}`, '_blank');
  }

  return (
    <div className="bg-card rounded-xl shadow-sm border border-muted/50 p-5 flex flex-col gap-3 hover:border-primary/20 transition-all">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="size-4 rounded border-muted-foreground/30 text-primary focus:ring-primary/30 shrink-0 cursor-pointer"
          />
          <Bookmark className="size-4 text-primary shrink-0" />
          <span className="font-bold text-foreground truncate">{item.keyword}</span>
        </div>
        <span className="text-[11px] text-muted-foreground font-medium shrink-0">{formattedDate}</span>
      </div>

      {/* Memo row */}
      <div className="flex-1">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              className="flex-1 px-3 py-1.5 text-sm bg-muted/50 border border-muted rounded-lg outline-none focus:ring-2 focus:ring-primary/30"
              value={memoValue}
              onChange={(e) => setMemoValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
              placeholder="메모를 입력하세요"
              maxLength={500}
            />
            <button
              onClick={handleSave}
              className="size-7 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              title="저장"
            >
              <Check className="size-3.5" />
            </button>
            <button
              onClick={handleCancel}
              className="size-7 flex items-center justify-center rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted transition-colors"
              title="취소"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="w-full text-left flex items-center gap-2 group"
          >
            <span className="text-sm text-muted-foreground flex-1">
              {item.memo ? item.memo : <span className="italic opacity-50">메모 추가...</span>}
            </span>
            <Pencil className="size-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
          </button>
        )}
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-2 pt-1 border-t border-muted/30">
        <button
          onClick={handleAnalyze}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
        >
          <Search className="size-3" />
          분석
          <ArrowRight className="size-3" />
        </button>
        <button
          onClick={() => onDelete(item.keyword)}
          className="ml-auto size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
          title="삭제"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function KeywordsPage() {
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name">("date");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery<SavedKeywordsResponse>({
    queryKey: ["savedKeywords"],
    queryFn: fetchSavedKeywords,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteKeyword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedKeywords"] });
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error("키워드 삭제에 실패했습니다. 다시 시도해주세요.");
    },
  });

  const memoMutation = useMutation({
    mutationFn: ({ keyword, memo }: { keyword: string; memo: string }) =>
      updateMemo(keyword, memo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedKeywords"] });
    },
  });

  const keywords = data?.keywords ?? [];

  const filteredKeywords = useMemo(() => {
    let list = keywords;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(k => k.keyword.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      if (sortBy === "name") return a.keyword.localeCompare(b.keyword, "ko");
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [keywords, searchQuery, sortBy]);

  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    setVisibleCount(24);
  }, [searchQuery, sortBy]);

  const displayedKeywords = filteredKeywords.slice(0, visibleCount);

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Bookmark className="size-8 text-primary" />}
        title="저장된 키워드"
        description="관심 키워드를 저장하고 메모를 남겨 효율적으로 관리하세요."
        rightContent={
          keywords.length > 0 ? (
            <span className="text-sm font-semibold text-muted-foreground">
              총 <strong className="text-foreground">{keywords.length}</strong>개
            </span>
          ) : undefined
        }
      />

      {/* Toolbar */}
      {!isLoading && keywords.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/20 rounded-2xl border border-muted/30 p-4">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-muted/50 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              placeholder="키워드 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort buttons */}
            <div className="flex items-center gap-1 bg-card border border-muted/50 rounded-lg p-1">
              <button
                onClick={() => setSortBy("date")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${sortBy === "date" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                최신순
              </button>
              <button
                onClick={() => setSortBy("name")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${sortBy === "name" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                이름순
              </button>
            </div>
            {/* Bulk actions */}
            {selected.size > 0 && (
              <>
                <span className="text-xs font-semibold text-muted-foreground">
                  {selected.size}개 선택
                </span>
                <a
                  href={`/compare?keywords=${Array.from(selected).map(k => encodeURIComponent(k)).join(",")}`}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
                    selected.size >= 2
                      ? "bg-violet-100 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-950/50"
                      : "bg-muted/50 text-muted-foreground cursor-not-allowed pointer-events-none"
                  }`}
                >
                  <ArrowRightLeft className="size-3.5" />
                  비교하기 {selected.size < 2 && "(2개 이상)"}
                </a>
                <a
                  href={`/bulk?keywords=${Array.from(selected).map(k => encodeURIComponent(k)).join(",")}`}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-950/50 transition-colors"
                >
                  <Database className="size-3.5" />
                  대량 분석
                </a>
              </>
            )}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-card rounded-xl shadow-sm border border-muted/50 p-5 animate-pulse"
            >
              <div className="h-4 w-32 bg-muted rounded mb-3" />
              <div className="h-3 w-full bg-muted/50 rounded mb-4" />
              <div className="h-8 w-20 bg-muted/40 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex items-center gap-3 px-5 py-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-400">
          <p className="text-sm font-medium">
            {(error as Error)?.message ?? "불러오는 중 오류가 발생했습니다."}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && keywords.length === 0 && <EmptyState />}

      {/* Keyword grid */}
      {!isLoading && keywords.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedKeywords.map((item) => (
              <KeywordCard
                key={item.id}
                item={item}
                isSelected={selected.has(item.keyword)}
                onToggleSelect={() => {
                  setSelected(prev => {
                    const next = new Set(prev);
                    if (next.has(item.keyword)) next.delete(item.keyword);
                    else next.add(item.keyword);
                    return next;
                  });
                }}
                onDelete={(keyword) => setDeleteTarget(keyword)}
                onMemoSave={(keyword, memo) => memoMutation.mutate({ keyword, memo })}
              />
            ))}
          </div>

          {visibleCount < filteredKeywords.length && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => setVisibleCount((v) => v + 24)}
                className="px-6 py-2.5 text-sm font-bold rounded-xl bg-card border border-muted-foreground/20 hover:bg-muted/50 hover:border-muted-foreground/40 transition-colors shadow-sm"
              >
                더보기 ({visibleCount} / {filteredKeywords.length})
              </button>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>키워드 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget}&rdquo; 키워드를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) deleteMutation.mutate(deleteTarget);
              }}
            >
              {deleteMutation.isPending ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
