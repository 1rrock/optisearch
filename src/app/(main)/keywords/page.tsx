"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Trash2, Search, Pencil, Check, X, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/shared/ui/page-header";

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
  const res = await fetch("/api/keywords/saved");
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
}: {
  item: SavedKeyword;
  onDelete: (keyword: string) => void;
  onMemoSave: (keyword: string, memo: string) => void;
}) {
  const router = useRouter();
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
    router.push(`/analyze?q=${encodeURIComponent(item.keyword)}`);
  }

  return (
    <div className="bg-card rounded-xl shadow-sm border border-muted/50 p-5 flex flex-col gap-3 hover:border-primary/20 transition-all">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
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

  const { data, isLoading, isError, error } = useQuery<SavedKeywordsResponse>({
    queryKey: ["savedKeywords"],
    queryFn: fetchSavedKeywords,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteKeyword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedKeywords"] });
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {keywords.map((item) => (
            <KeywordCard
              key={item.id}
              item={item}
              onDelete={(keyword) => deleteMutation.mutate(keyword)}
              onMemoSave={(keyword, memo) => memoMutation.mutate({ keyword, memo })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
