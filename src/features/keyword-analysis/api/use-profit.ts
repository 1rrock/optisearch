import { useMutation } from "@tanstack/react-query";
import type { ProfitSignal } from "@/entities/keyword/model/types";

export type ProfitCompetitionLevel = "LOW" | "MEDIUM" | "HIGH";

export interface ProfitScoreRequest {
  keyword: string;
  searchVolume: number;
  expectedClicks: number;
  competition: ProfitCompetitionLevel;
  conversionRate?: number;
}

export interface ProfitScoreResponse {
  keyword: string;
  baseProfitScore: number;
  profitScore: number;
  profitSignal: ProfitSignal;
  opportunityTier: ProfitSignal;
  normalizedMetrics: {
    demandScore: number;
    competitionScore: number;
    clickPotentialScore: number;
    conversionScore: number;
  };
  inputMetrics: {
    searchVolume: number;
    expectedClicks: number;
    competition: ProfitCompetitionLevel;
    conversionRate: number;
  };
  weights: {
    demand: number;
    competition: number;
    clickPotential: number;
    conversion: number;
  };
  calculatedAt: string;
  quota: {
    remaining: number;
    used: number;
    limit: number;
    resetAt: string;
    tier: "free" | "basic" | "pro";
  };
  roas?: {
    value: number;
    score: number;
    monthlyAdSpend: number;
    monthlyAdRevenue: number;
    signal: "HIGH" | "MEDIUM" | "LOW";
  };
}

async function scoreProfit(payload: ProfitScoreRequest): Promise<ProfitScoreResponse> {
  const res = await fetch("/api/profit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({} as { error?: string; message?: string }));
    throw new Error(data.error ?? data.message ?? `수익성 점수 계산 실패 (${res.status})`);
  }

  return res.json();
}

export function useProfitMutation() {
  return useMutation<ProfitScoreResponse, Error, ProfitScoreRequest>({
    mutationFn: scoreProfit,
  });
}
