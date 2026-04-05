"use client";

import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/shared/ui/popover";

interface SavedKeyword {
  keyword: string;
  id?: string;
}

interface SavedKeywordsPopoverProps {
  /** "single": click to add one at a time. "multi": checkbox select then batch add. */
  mode: "single" | "multi";
  /** Called with selected keyword(s). Single mode passes a 1-element array. */
  onAdd: (keywords: string[]) => void;
  /** Trigger button label. Default: "저장됨" */
  triggerLabel?: string;
  /** Override trigger button className */
  triggerClassName?: string;
  /** PopoverContent alignment. Default: "end" */
  align?: "start" | "center" | "end";
}

export function SavedKeywordsPopover({
  mode,
  onAdd,
  triggerLabel = "저장됨",
  triggerClassName,
  align = "end",
}: SavedKeywordsPopoverProps) {
  const [open, setOpen] = useState(false);
  const [keywords, setKeywords] = useState<SavedKeyword[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Lazy-fetch saved keywords when popover opens
  useEffect(() => {
    if (open) {
      setLoading(true);
      fetch("/api/keywords/saved")
        .then((res) => (res.ok ? res.json() : { keywords: [] }))
        .then((data) => setKeywords(data.keywords ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      // Reset selection when closing
      setSelected(new Set());
    }
  }, [open]);

  function handleSingleAdd(keyword: string) {
    onAdd([keyword]);
    setOpen(false);
  }

  function handleMultiAdd() {
    if (selected.size === 0) return;
    onAdd(Array.from(selected));
    setOpen(false);
  }

  function toggleSelect(keyword: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(keyword)) next.delete(keyword);
      else next.add(keyword);
      return next;
    });
  }

  const defaultTriggerClass =
    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-muted/60 bg-muted/20 text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:bg-muted/40 transition-colors";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={triggerClassName ?? defaultTriggerClass}>
          <Bookmark className="size-3.5" />
          {triggerLabel}
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-72 p-0">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            불러오는 중...
          </div>
        ) : keywords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <Bookmark className="size-6 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">저장된 키워드가 없습니다</p>
          </div>
        ) : mode === "single" ? (
          /* ── Single-click mode ── */
          <div className="flex flex-col">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-3 py-2 border-b border-muted/30">
              저장된 키워드
            </p>
            <div className="max-h-60 overflow-y-auto p-1">
              {keywords.map((sk) => (
                <button
                  key={sk.id ?? sk.keyword}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent transition-colors truncate"
                  onClick={() => handleSingleAdd(sk.keyword)}
                >
                  {sk.keyword}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ── Multi-select mode ── */
          <div className="flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-muted/30">
              <p className="text-xs font-bold text-muted-foreground">
                {selected.size}개 선택
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelected(new Set(keywords.map((k) => k.keyword)))}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  전체
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="text-xs font-semibold text-muted-foreground hover:underline"
                >
                  해제
                </button>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto p-1.5">
              {keywords.map((sk) => (
                <label
                  key={sk.id ?? sk.keyword}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-sm ${
                    selected.has(sk.keyword)
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-accent"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(sk.keyword)}
                    onChange={() => toggleSelect(sk.keyword)}
                    className="size-3.5 rounded border-muted-foreground/30 text-primary focus:ring-primary/30"
                  />
                  <span className="truncate">{sk.keyword}</span>
                </label>
              ))}
            </div>
            <div className="p-2 border-t border-muted/30">
              <button
                type="button"
                onClick={handleMultiAdd}
                disabled={selected.size === 0}
                className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
              >
                {selected.size}개 추가
              </button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
