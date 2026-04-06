"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Clock, X, ArrowUpRight } from "lucide-react";
import { useUserStore } from "@/shared/stores/user-store";
import { cn } from "@/shared/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HistoryItem {
  id: string;
  keyword: string;
  keywordGrade: string | null;
  totalSearchVolume: number;
  createdAt: string;
}

interface SearchInputWithHistoryProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (keyword: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** Additional class for the outer wrapper */
  wrapperClassName?: string;
}

// ---------------------------------------------------------------------------
// Grade badge colors
// ---------------------------------------------------------------------------

function gradeColor(grade: string | null): string {
  switch (grade) {
    case "S":
      return "text-rose-500 bg-rose-50 dark:bg-rose-950/40";
    case "A":
      return "text-amber-600 bg-amber-50 dark:bg-amber-950/40";
    case "B":
      return "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40";
    case "C":
      return "text-blue-600 bg-blue-50 dark:bg-blue-950/40";
    case "D":
      return "text-gray-500 bg-gray-100 dark:bg-gray-800/40";
    default:
      return "text-muted-foreground bg-muted/60";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SearchInputWithHistory({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "키워드를 입력하세요",
  className,
  wrapperClassName,
}: SearchInputWithHistoryProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch search history
  const { data: historyData } = useQuery<{ history: HistoryItem[] }>({
    queryKey: ["search-history"],
    queryFn: async () => {
      const res = await fetch("/api/history");
      if (!res.ok) return { history: [] };
      return res.json();
    },
    staleTime: 0,
  });

  const allHistory = historyData?.history ?? [];

  // Deduplicate by keyword (keep most recent)
  const uniqueHistory = allHistory.reduce<HistoryItem[]>((acc, item) => {
    if (!acc.some((h) => h.keyword === item.keyword)) {
      acc.push(item);
    }
    return acc;
  }, []);

  // Filter by input value & exclude deleting items
  const filtered = (
    value.trim()
      ? uniqueHistory.filter((h) =>
          h.keyword.toLowerCase().includes(value.toLowerCase())
        )
      : uniqueHistory
  ).filter((h) => !deletingIds.has(h.id));

  const displayItems = filtered.slice(0, 10);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // Reset highlight when dropdown items change
  useEffect(() => {
    setHighlightIndex(-1);
  }, [value]);

  const selectItem = useCallback(
    (keyword: string) => {
      onChange(keyword);
      setOpen(false);
      setHighlightIndex(-1);
      onSubmit(keyword);
    },
    [onChange, onSubmit]
  );

  async function handleDelete(e: React.MouseEvent, item: HistoryItem) {
    e.preventDefault();
    e.stopPropagation();

    // Optimistic: hide immediately
    setDeletingIds((prev) => new Set(prev).add(item.id));

    try {
      const res = await fetch(`/api/history?id=${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      // Refresh history cache
      queryClient.invalidateQueries({ queryKey: ["search-history"] });
      void useUserStore.getState().refresh();
    } catch {
      // Rollback on failure
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Ignore Enter during Korean IME composition to prevent partial text submission
    if (e.nativeEvent.isComposing) return;

    if (!open || displayItems.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev < displayItems.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : displayItems.length - 1
        );
        break;
      case "Enter":
        if (highlightIndex >= 0 && highlightIndex < displayItems.length) {
          e.preventDefault();
          selectItem(displayItems[highlightIndex].keyword);
        }
        break;
      case "Escape":
        setOpen(false);
        setHighlightIndex(-1);
        break;
    }
  }

  function handleFocus() {
    if (!disabled) setOpen(true);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
    if (!open) setOpen(true);
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "방금 전";
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHour < 24) return `${diffHour}시간 전`;
    if (diffDay < 7) return `${diffDay}일 전`;
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  }

  const showDropdown = open && !disabled && displayItems.length > 0;

  return (
    <div ref={wrapperRef} className={cn("relative", wrapperClassName)}>
      {/* Input */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
          <Search className="text-muted-foreground size-5" />
        </div>
        <input
          ref={inputRef}
          className={cn(
            "w-full pl-14 pr-32 py-5 bg-background border border-muted/40 shadow-xl shadow-muted/50 focus:ring-2 focus:ring-primary text-lg font-medium placeholder:text-muted-foreground outline-none transition-all",
            showDropdown ? "rounded-t-2xl rounded-b-none" : "rounded-2xl",
            className
          )}
          placeholder={placeholder}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-controls="search-history-listbox"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="absolute right-3 inset-y-3 px-8 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {disabled ? "분석 중..." : "분석"}
        </button>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          id="search-history-listbox"
          role="listbox"
          className="absolute z-50 left-0 right-0 bg-background border border-t-0 border-muted/40 rounded-b-2xl shadow-2xl shadow-black/20 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-muted/20">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Clock className="size-3" />
              {value.trim() ? "검색 결과" : "최근 검색"}
            </span>
          </div>

          {/* Items */}
          <div className="max-h-[360px] overflow-y-auto scrollbar-hide">
            {displayItems.map((item, idx) => (
              <div
                key={item.id}
                role="option"
                aria-selected={idx === highlightIndex}
                className={cn(
                  "flex items-center gap-3 w-full px-5 py-3 text-left transition-colors cursor-pointer group/item",
                  idx === highlightIndex
                    ? "bg-primary/5"
                    : "hover:bg-muted/40"
                )}
                onMouseDown={(e) => {
                  // Only select if not clicking the delete button
                  if ((e.target as HTMLElement).closest("[data-delete-btn]")) return;
                  e.preventDefault();
                  selectItem(item.keyword);
                }}
                onMouseEnter={() => setHighlightIndex(idx)}
              >
                {/* Icon */}
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50 shrink-0">
                  {value.trim() ? (
                    <Search className="size-3.5 text-muted-foreground" />
                  ) : (
                    <Clock className="size-3.5 text-muted-foreground" />
                  )}
                </div>

                {/* Keyword + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate">
                      {highlightMatch(item.keyword, value)}
                    </span>
                    {item.keywordGrade && (
                      <span
                        className={cn(
                          "px-1.5 py-0.5 text-[10px] font-bold rounded",
                          gradeColor(item.keywordGrade)
                        )}
                      >
                        {item.keywordGrade}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">
                      {item.totalSearchVolume > 0
                        ? `월간 ${item.totalSearchVolume.toLocaleString()}회`
                        : ""}
                    </span>
                    <span className="text-[11px] text-muted-foreground/60">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  data-delete-btn
                  type="button"
                  className="p-1.5 rounded-lg opacity-0 group-hover/item:opacity-100 hover:bg-muted/80 text-muted-foreground hover:text-rose-500 transition-all shrink-0"
                  onMouseDown={(e) => handleDelete(e, item)}
                  title="검색 기록 삭제"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Footer hint */}
          <div className="flex items-center justify-center gap-4 px-5 py-2 border-t border-muted/20 bg-muted/10">
            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">↑↓</kbd>
              이동
            </span>
            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">Enter</kbd>
              선택
            </span>
            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">Esc</kbd>
              닫기
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Highlight matching text
// ---------------------------------------------------------------------------

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-primary font-bold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}
