export type CompetitionLevel = "LOW" | "MEDIUM" | "HIGH";
export type ProfitSignal = "HIGH" | "MEDIUM" | "LOW";

export interface ProfitScoringInput {
  keyword: string;
  searchVolume: number;
  expectedClicks: number;
  competition: CompetitionLevel;
  conversionRate: number;
  /** Optional: actual CPC from SearchAD estimate cache (KRW) */
  avgCpc?: number;
  /** Optional: average order value for ROAS calculation (KRW) */
  avgOrderValue?: number;
}

interface NormalizedMetrics {
  demandScore: number;
  competitionScore: number;
  clickPotentialScore: number;
  conversionScore: number;
}

const SCORING_WEIGHTS = {
  demand: 0.35,
  competition: 0.25,
  clickPotential: 0.2,
  conversion: 0.2,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeDemand(searchVolume: number): number {
  return clamp((searchVolume / 50_000) * 100, 0, 100);
}

function normalizeCompetition(competition: CompetitionLevel): number {
  switch (competition) {
    case "LOW":
      return 100;
    case "MEDIUM":
      return 60;
    case "HIGH":
      return 25;
    default:
      return 25;
  }
}

function normalizeClickPotential(expectedClicks: number): number {
  return clamp((expectedClicks / 10_000) * 100, 0, 100);
}

function normalizeConversion(conversionRate: number): number {
  return clamp((conversionRate / 0.2) * 100, 0, 100);
}

function getOpportunityTier(score: number): ProfitSignal {
  if (score >= 75) return "HIGH";
  if (score >= 50) return "MEDIUM";
  return "LOW";
}

export function scoreProfitability(input: ProfitScoringInput) {
  const normalizedMetrics: NormalizedMetrics = {
    demandScore: Math.round(normalizeDemand(input.searchVolume)),
    competitionScore: Math.round(normalizeCompetition(input.competition)),
    clickPotentialScore: Math.round(normalizeClickPotential(input.expectedClicks)),
    conversionScore: Math.round(normalizeConversion(input.conversionRate)),
  };

  const weightedScore =
    normalizedMetrics.demandScore * SCORING_WEIGHTS.demand +
    normalizedMetrics.competitionScore * SCORING_WEIGHTS.competition +
    normalizedMetrics.clickPotentialScore * SCORING_WEIGHTS.clickPotential +
    normalizedMetrics.conversionScore * SCORING_WEIGHTS.conversion;

  const baseProfitScore = Math.round(clamp(weightedScore, 0, 100));
  const profitSignal = getOpportunityTier(baseProfitScore);

  // CPC-based ROAS calculation (only when avgCpc is provided)
  // Formula: (revenue - adSpend) / adSpend
  let roasResult:
    | {
        value: number;
        score: number;
        monthlyAdSpend: number;
        monthlyAdRevenue: number;
        signal: "HIGH" | "MEDIUM" | "LOW";
      }
    | undefined;

  if (input.avgCpc && input.avgCpc > 0) {
    const aov = input.avgOrderValue ?? 30000; // default 30,000 KRW
    const spend = input.expectedClicks * input.avgCpc;
    const revenue = input.expectedClicks * input.conversionRate * aov;
    const roas = spend > 0 ? (revenue - spend) / spend : 0;

    // ROAS score: 0-100 scale with breakpoints at 0, 1, 3
    let score: number;
    if (roas <= 0) score = 0;
    else if (roas <= 1) score = Math.round(roas * 30);
    else if (roas <= 3) score = Math.round(30 + ((roas - 1) / 2) * 40);
    else score = Math.round(Math.min(100, 70 + ((roas - 3) / 5) * 30));

    roasResult = {
      value: Math.round(roas * 100) / 100,
      score,
      monthlyAdSpend: spend,
      monthlyAdRevenue: revenue,
      signal: score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW",
    };
  }

  return {
    keyword: input.keyword,
    baseProfitScore,
    profitScore: baseProfitScore,
    profitSignal,
    opportunityTier: profitSignal,
    normalizedMetrics,
    inputMetrics: {
      searchVolume: input.searchVolume,
      expectedClicks: input.expectedClicks,
      competition: input.competition,
      conversionRate: input.conversionRate,
    },
    weights: SCORING_WEIGHTS,
    calculatedAt: new Date().toISOString(),
    roas: roasResult,
  };
}
