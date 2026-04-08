export type CompetitionLevel = "LOW" | "MEDIUM" | "HIGH";
export type ProfitSignal = "HIGH" | "MEDIUM" | "LOW";

export interface ProfitScoringInput {
  keyword: string;
  searchVolume: number;
  expectedClicks: number;
  competition: CompetitionLevel;
  conversionRate: number;
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
  };
}
