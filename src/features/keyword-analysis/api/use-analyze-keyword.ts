import { useMutation } from "@tanstack/react-query";
import type { KeywordSearchResult, RelatedKeyword } from "@/entities/keyword/model/types";

export interface AnalyzeKeywordResponse {
  analysis: KeywordSearchResult;
  relatedKeywords: RelatedKeyword[];
}

async function analyzeKeyword(keyword: string): Promise<AnalyzeKeywordResponse> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `분석 실패 (${res.status})`);
  }

  return res.json();
}

export function useAnalyzeKeyword() {
  return useMutation({
    mutationFn: analyzeKeyword,
  });
}
