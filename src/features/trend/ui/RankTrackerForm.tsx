"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { useCreateRankTrackTarget, type RankTrackTarget } from "@/features/trend/api/use-rank";

function parseStoreIdFromUrl(storeUrl: string): string {
  const trimmed = storeUrl.trim();
  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.replace(/^\/+/, "");

    if (hostname === "smartstore.naver.com") {
      const [storeId] = pathname.split("/");
      if (!storeId) throw new Error("스토어 URL에서 스토어 아이디를 찾을 수 없습니다.");
      return storeId;
    }

    if (hostname.endsWith(".smartstore.naver.com")) {
      const storeId = hostname.replace(".smartstore.naver.com", "");
      if (!storeId) throw new Error("스토어 URL에서 스토어 아이디를 찾을 수 없습니다.");
      return storeId;
    }

    const [fallbackStoreId] = pathname.split("/");
    if (!fallbackStoreId) throw new Error("스토어 URL 형식이 올바르지 않습니다.");
    return fallbackStoreId;
  } catch {
    throw new Error("올바른 스토어 URL을 입력해주세요.");
  }
}

export function RankTrackerForm({
  onTracked,
}: {
  onTracked?: (target: RankTrackTarget) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const createTrackMutation = useCreateRankTrackTarget();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedKeyword = keyword.trim();
    const trimmedStoreUrl = storeUrl.trim();

    if (!trimmedKeyword || !trimmedStoreUrl) {
      setErrorMessage("키워드와 스토어 URL을 모두 입력해주세요.");
      return;
    }

    let storeId: string;
    try {
      storeId = parseStoreIdFromUrl(trimmedStoreUrl);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "스토어 URL을 확인해주세요.");
      return;
    }

    try {
      const result = await createTrackMutation.mutateAsync({
        keyword: trimmedKeyword,
        storeId,
      });

      setSuccessMessage("순위 추적 대상이 등록되었습니다.");
      onTracked?.(result.target);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "순위 추적 등록 중 오류가 발생했습니다.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">키워드</p>
          <Input
            className="h-12 bg-muted/30"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="예: 남자 러닝화"
            maxLength={120}
          />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">스토어 URL</p>
          <Input
            className="h-12 bg-muted/30"
            type="url"
            value={storeUrl}
            onChange={(e) => setStoreUrl(e.target.value)}
            placeholder="https://smartstore.naver.com/yourstore"
          />
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
          {successMessage}
        </div>
      )}

      <Button
        type="submit"
        disabled={createTrackMutation.isPending}
        className="w-full sm:w-auto font-bold"
      >
        {createTrackMutation.isPending ? (
          <>
            <Loader2 className="size-4 animate-spin mr-1" />
            등록 중...
          </>
        ) : (
          "순위 추적 등록"
        )}
      </Button>
    </form>
  );
}
