"use client";

import { useRankTrackTargets, useDeleteRankTrackTarget } from "../api/use-rank";
import { Trash2, TrendingUp, TrendingDown, Minus, Store } from "lucide-react";
import { toast } from "sonner";

interface RankTargetListProps {
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function RankTargetList({ selectedId, onSelect }: RankTargetListProps) {
  const { data, isLoading, error } = useRankTrackTargets();
  const deleteMutation = useDeleteRankTrackTarget();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse h-[68px] bg-muted/40 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-rose-500 p-4 bg-rose-50 rounded-xl border border-rose-100">
        추적 대상을 불러오는데 실패했습니다: {error.message}
      </div>
    );
  }

  const targets = data?.targets || [];

  if (targets.length === 0) {
    return null;
  }

  const handleDelete = async (e: React.MouseEvent, id: string, keyword: string) => {
    e.stopPropagation();
    if (!window.confirm(`'${keyword}' 추적을 삭제하시겠습니까?`)) return;

    toast.promise(deleteMutation.mutateAsync(id), {
      loading: "삭제 중...",
      success: "삭제되었습니다.",
      error: "삭제 실패",
    });
  };

  return (
    <div className="flex flex-col gap-2 p-3 sm:p-4">
      {targets.map(({ target, latestSnapshot }) => {
        const isSelected = selectedId === target.id;
        const rank = latestSnapshot?.rank ?? 0;
        const hasRank = rank > 0;

        return (
          <div
            key={target.id}
            onClick={() => onSelect(target.id)}
            className={`
              group flex flex-row items-center justify-between p-3 rounded-xl cursor-pointer transition-all border
              ${isSelected ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm" : "border-muted/60 bg-card hover:border-primary/40 hover:bg-muted/20 shadow-sm"}
            `}
          >
            <div className="flex-[2] min-w-0 pr-3">
              <h4 className="font-bold text-[13px] sm:text-sm truncate text-foreground">{target.keyword}</h4>
              <div className="flex items-center text-[10px] sm:text-xs text-muted-foreground mt-1">
                <Store className="size-3 mr-1 shrink-0" />
                <span className="truncate">{target.storeId}</span>
              </div>
            </div>
            
            <div className="flex shrink-0 items-center justify-end gap-3 min-w-fit">
              <div className="flex flex-col items-end">
                {hasRank ? (
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-lg sm:text-xl font-bold text-emerald-600">{rank}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">위</span>
                  </div>
                ) : (
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-sm">
                    조회중
                  </span>
                )}
              </div>
              
              <button
                onClick={(e) => handleDelete(e, target.id, target.keyword)}
                disabled={deleteMutation.isPending}
                className="p-1.5 text-muted-foreground/30 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all -mr-1 shrink-0"
                title="삭제"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}