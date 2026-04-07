import type { KeywordGrade } from "@/shared/model/keyword-grade";

// ---------------------------------------------------------------------------
// Chart colors
// ---------------------------------------------------------------------------

export const CHART_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
  "#14b8a6",
] as const;

// ---------------------------------------------------------------------------
// Application config
// ---------------------------------------------------------------------------

export const APP_CONFIG = {
  serviceName: "옵티써치",
  serviceNameEn: "OptiSearch",
  version: "0.1.0",
  supportChannel: "http://pf.kakao.com/_CupuX",
  /** Naver keyword data is cached for this many hours before re-fetching */
  keywordCacheTtlHours: 24,
  /** Top-posts data is cached for this many hours */
  topPostsCacheTtlHours: 6,
} as const;

// ---------------------------------------------------------------------------
// Plan limits
// Feature keys mirror ai_usage.feature column values:
//   search | title | draft | score | bulk | trend
// ---------------------------------------------------------------------------

export type PlanId = "free" | "basic" | "pro";

export interface PlanLimit {
  /** Daily keyword search limit (-1 = unlimited) */
  dailySearch: number;
  /** Daily AI title suggestion limit */
  dailyTitle: number;
  /** Daily AI draft generation limit */
  dailyDraft: number;
  /** Daily AI content score limit */
  dailyScore: number;
  /** Bulk analysis keywords per run (-1 = feature disabled) */
  bulkKeywordsPerRun: number;
  /** Trend period in months (-1 = all available history) */
  trendPeriodMonths: number;
  /** Whether demographic (gender/age) filter is available */
  demographicsEnabled: boolean;
  /** Max number of top posts shown (0 = disabled) */
  topPostsLimit: number;
  /** Whether section analysis is available */
  sectionAnalysisEnabled: boolean;
  /** Whether shopping insight is available */
  shoppingInsightEnabled: boolean;
  /** Whether search history export to Excel is available */
  historyExcelEnabled: boolean;
  /** Max saved keywords (-1 = unlimited) */
  savedKeywordLimit: number;
  /** Max search history entries stored (-1 = unlimited) */
  historyLimit: number;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimit> = {
  free: {
    dailySearch: 10,
    dailyTitle: 3,
    dailyDraft: 1,
    dailyScore: 1,
    bulkKeywordsPerRun: -1,
    trendPeriodMonths: 3,
    demographicsEnabled: false,
    topPostsLimit: 3,
    sectionAnalysisEnabled: false,
    shoppingInsightEnabled: false,
    savedKeywordLimit: 10,
    historyExcelEnabled: false,
    historyLimit: 10,
  },
  basic: {
    dailySearch: -1,
    dailyTitle: 20,
    dailyDraft: 5,
    dailyScore: 10,
    bulkKeywordsPerRun: 50,
    trendPeriodMonths: 12,
    demographicsEnabled: true,
    topPostsLimit: 7,
    sectionAnalysisEnabled: true,
    shoppingInsightEnabled: true,
    savedKeywordLimit: -1,
    historyExcelEnabled: true,
    historyLimit: -1,
  },
  pro: {
    dailySearch: -1,
    dailyTitle: 100,
    dailyDraft: 30,
    dailyScore: 50,
    bulkKeywordsPerRun: 500,
    trendPeriodMonths: -1,
    demographicsEnabled: true,
    topPostsLimit: 7,
    sectionAnalysisEnabled: true,
    shoppingInsightEnabled: true,
    savedKeywordLimit: -1,
    historyExcelEnabled: true,
    historyLimit: -1,
  },
} as const;

// ---------------------------------------------------------------------------
// Plan pricing (KRW)
// ---------------------------------------------------------------------------

export const PLAN_PRICING: Record<PlanId, { monthly: number; label: string }> = {
  free: { monthly: 0, label: "무료" },
  basic: { monthly: 9900, label: "베이직" },
  pro: { monthly: 29000, label: "프로" },
} as const;

// ---------------------------------------------------------------------------
// Keyword grades (S+ ~ D-)
// ---------------------------------------------------------------------------

export interface KeywordGradeConfig {
  grade: KeywordGrade;
  /** Minimum composite score to reach this grade (0–100) */
  minScore: number;
  /** Maximum composite score (inclusive) */
  maxScore: number;
  /** Display color token for the grade badge */
  color: string;
  /** Short description shown in the UI */
  description: string;
}

/** Ordered from best (S+) to worst (D-) */
export const KEYWORD_GRADES: KeywordGradeConfig[] = [
  { grade: "S+", minScore: 96, maxScore: 100, color: "#6C31E3", description: "최상위 — 검색량 많고 경쟁 극히 낮음" },
  { grade: "S",  minScore: 91, maxScore: 95,  color: "#7C3AED", description: "최상위 — 검색량 많고 경쟁 낮음" },
  { grade: "S-", minScore: 86, maxScore: 90,  color: "#8B5CF6", description: "상위 — 우수한 검색량·경쟁 균형" },
  { grade: "A+", minScore: 81, maxScore: 85,  color: "#2563EB", description: "상위 — 좋은 기회 키워드" },
  { grade: "A",  minScore: 76, maxScore: 80,  color: "#3B82F6", description: "상위 — 안정적인 SEO 기회" },
  { grade: "A-", minScore: 71, maxScore: 75,  color: "#60A5FA", description: "중상위 — 진입 권장" },
  { grade: "B+", minScore: 66, maxScore: 70,  color: "#16A34A", description: "중위 — 준수한 기회" },
  { grade: "B",  minScore: 61, maxScore: 65,  color: "#22C55E", description: "중위 — 평균적인 경쟁도" },
  { grade: "B-", minScore: 56, maxScore: 60,  color: "#4ADE80", description: "중위 — 신중한 접근 필요" },
  { grade: "C+", minScore: 51, maxScore: 55,  color: "#CA8A04", description: "중하위 — 경쟁 다소 높음" },
  { grade: "C",  minScore: 46, maxScore: 50,  color: "#EAB308", description: "중하위 — 전략 없이 어려움" },
  { grade: "C-", minScore: 41, maxScore: 45,  color: "#FACC15", description: "하위 — 장기 전략 필요" },
  { grade: "D+", minScore: 31, maxScore: 40,  color: "#EA580C", description: "하위 — 신규 블로그에 비권장" },
  { grade: "D",  minScore: 21, maxScore: 30,  color: "#F97316", description: "하위 — 경쟁 매우 높음" },
  { grade: "D-", minScore: 0,  maxScore: 20,  color: "#EF4444", description: "최하위 — 진입 비권장" },
] as const;

/** Helper: look up a grade config by grade string */
export function getKeywordGradeConfig(grade: KeywordGrade): KeywordGradeConfig {
  return KEYWORD_GRADES.find((g) => g.grade === grade) ?? KEYWORD_GRADES[KEYWORD_GRADES.length - 1];
}

/** Helper: derive a grade from a composite score (0–100) */
export function gradeFromScore(score: number): KeywordGrade {
  for (const config of KEYWORD_GRADES) {
    if (score >= config.minScore && score <= config.maxScore) {
      return config.grade;
    }
  }
  return "D-";
}

// ---------------------------------------------------------------------------
// Saturation index thresholds
// ---------------------------------------------------------------------------

export interface SaturationThreshold {
  /** Label for this saturation bucket */
  label: "매우 낮음" | "낮음" | "보통" | "높음" | "매우 높음";
  /**
   * Maximum saturation ratio (searchVolume / blogPostCount) for this bucket.
   * Lower ratio = more posts relative to searches = higher saturation.
   * e.g. ratio < 0.01 means very over-saturated market.
   */
  maxRatio: number;
  /** 0–100 score for this saturation bucket (higher = easier to rank) */
  score: number;
  /** Tailwind/CSS color token for display */
  color: string;
}

/**
 * Ordered from least saturated (best opportunity) to most saturated.
 * Saturation ratio = total search volume / blog post count.
 * A high ratio means few posts relative to demand — good opportunity.
 */
export const SATURATION_THRESHOLDS: SaturationThreshold[] = [
  { label: "매우 낮음", maxRatio: Infinity, score: 100, color: "#16A34A" }, // ratio >= 1.0
  { label: "낮음",     maxRatio: 1.0,       score: 80,  color: "#22C55E" }, // 0.5 ≤ ratio < 1.0
  { label: "보통",     maxRatio: 0.5,       score: 60,  color: "#EAB308" }, // 0.1 ≤ ratio < 0.5
  { label: "높음",     maxRatio: 0.1,       score: 35,  color: "#EA580C" }, // 0.01 ≤ ratio < 0.1
  { label: "매우 높음", maxRatio: 0.01,      score: 10,  color: "#EF4444" }, // ratio < 0.01
] as const;

/** Helper: classify a saturation ratio into its threshold bucket */
export function getSaturationThreshold(ratio: number): SaturationThreshold {
  for (const threshold of SATURATION_THRESHOLDS) {
    if (ratio >= threshold.maxRatio) {
      return threshold;
    }
  }
  return SATURATION_THRESHOLDS[SATURATION_THRESHOLDS.length - 1];
}
