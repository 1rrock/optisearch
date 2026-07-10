import type { KeywordGrade } from "@/shared/model/keyword-grade";

// ---------------------------------------------------------------------------
// Censored / anomaly detection thresholds
// ---------------------------------------------------------------------------

/** SearchAd total volume at or below this is treated as censored (triggers fallback) */
export const CENSORED_VOLUME_THRESHOLD = 20;

/** SearchAd total volume below this triggers anomaly check against blog count */
export const ANOMALY_VOLUME_THRESHOLD = 500;

/** Blog post count above this (combined with low SearchAd volume) signals censorship anomaly */
export const ANOMALY_BLOG_THRESHOLD = 50_000;

/**
 * Non-censored anchor keywords for blog-ratio estimation.
 * Spread across small / medium / large volume tiers for robust median.
 */
export const ANCHOR_KEYWORDS = [
  "아이폰",      // ~174K vol, tech
  "삼성전자",    // ~20M vol, mega
  "볼보",        // ~130K vol, auto
  "제주도맛집",  // ~44K vol, small
  "건조기",      // ~65K vol, appliance
  "기아차",      // ~176K vol, auto
] as const;

/** CV thresholds for blog-ratio estimation confidence */
export const CONFIDENCE_CV_THRESHOLDS = { high: 0.3, medium: 0.6 } as const;

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
//   search | analyze | draft | bulk | trend
// ---------------------------------------------------------------------------

export type PlanId = "free" | "basic" | "pro";

export interface PlanLimit {
  /** Daily keyword search limit (-1 = unlimited) */
  dailySearch: number;
  /** Daily AI competitive analysis limit */
  dailyAnalyze: number;
  /** Daily AI draft generation limit */
  dailyDraft: number;
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
  /** Max rank track targets (-1 = unlimited) */
  maxTrackTargets: number;
  /** Max saved keywords (-1 = unlimited) */
  savedKeywordLimit: number;
  /** Max search history entries stored (-1 = unlimited) */
  historyLimit: number;
}

// 주의: `-1`의 의미가 필드마다 다르다.
//   dailySearch / dailyAnalyze / dailyDraft / savedKeywordLimit / historyLimit
//     → usage-service.ts:30 에서 "무제한"
//   bulkKeywordsPerRun
//     → keywords/batch/route.ts:24 에서 "이 플랜은 대량분석 불가"
// 새 값을 넣을 때 반드시 확인할 것.
export const PLAN_LIMITS: Record<PlanId, PlanLimit> = {
  free: {
    // 검색량 조회는 네이버 공개 API 데이터이고 경쟁사가 무료로 푼다.
    // 여기에 한도를 걸어 파는 건 이길 수 없는 싸움이라, 사실상 열어둔다.
    // (완전 무제한 대신 유한값 — 네이버 API 쿼터를 지키는 상한선)
    dailySearch: 100,
    dailyAnalyze: 10,
    // 초안 2회는 "품질을 판단할 수 있는 최소치"다. 1회로는 비교가 안 된다.
    dailyDraft: 2,
    maxTrackTargets: 3,
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
    dailyAnalyze: 50,
    // 유료의 이유는 검색 횟수가 아니라 AI 초안이다.
    dailyDraft: 10,
    maxTrackTargets: 20,
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
    dailyAnalyze: 100,
    dailyDraft: 30,
    maxTrackTargets: -1,
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

/**
 * `monthly` 는 결제 금액이다. create-rebill/route.ts:65 에서 그대로 PayApp
 * `goodprice` 로 넘어간다. 표시용 숫자가 아니므로 UI만 보고 고치지 말 것.
 *
 * `originalMonthly` 는 취소선으로 보여줄 정가. 없으면 할인 표기를 하지 않는다.
 * 얼리버드 할인을 끝낼 때는 monthly 를 originalMonthly 로 되돌리고
 * originalMonthly 를 지우면 된다.
 */
export const PLAN_PRICING: Record<
  PlanId,
  { monthly: number; label: string; originalMonthly?: number }
> = {
  free: { monthly: 0, label: "무료" },
  basic: { monthly: 4900, label: "베이직", originalMonthly: 9900 },
  pro: { monthly: 14900, label: "프로", originalMonthly: 29900 },
} as const;

// ---------------------------------------------------------------------------
// Plan upgrade pricing and refund policy
// ---------------------------------------------------------------------------

export const REFUND_POLICY = {
  maxDaysSincePayment: 7,
  maxKeywordSearches: 5,
  maxAiUsage: 0,
} as const;

// ---------------------------------------------------------------------------
// Signup trial: 가입 즉시 14일간 Pro 권한을 부여한다.
// ---------------------------------------------------------------------------

export const TRIAL_DURATION_DAYS = 14;
export const TRIAL_PLAN: PlanId = "pro";

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
  { grade: "S", minScore: 91, maxScore: 95, color: "#7C3AED", description: "최상위 — 검색량 많고 경쟁 낮음" },
  { grade: "S-", minScore: 86, maxScore: 90, color: "#8B5CF6", description: "상위 — 우수한 검색량·경쟁 균형" },
  { grade: "A+", minScore: 81, maxScore: 85, color: "#2563EB", description: "상위 — 좋은 기회 키워드" },
  { grade: "A", minScore: 76, maxScore: 80, color: "#3B82F6", description: "상위 — 안정적인 SEO 기회" },
  { grade: "A-", minScore: 71, maxScore: 75, color: "#60A5FA", description: "중상위 — 진입 권장" },
  { grade: "B+", minScore: 66, maxScore: 70, color: "#16A34A", description: "중위 — 준수한 기회" },
  { grade: "B", minScore: 61, maxScore: 65, color: "#22C55E", description: "중위 — 평균적인 경쟁도" },
  { grade: "B-", minScore: 56, maxScore: 60, color: "#4ADE80", description: "중위 — 신중한 접근 필요" },
  { grade: "C+", minScore: 51, maxScore: 55, color: "#CA8A04", description: "중하위 — 경쟁 다소 높음" },
  { grade: "C", minScore: 46, maxScore: 50, color: "#EAB308", description: "중하위 — 전략 없이 어려움" },
  { grade: "C-", minScore: 41, maxScore: 45, color: "#FACC15", description: "하위 — 장기 전략 필요" },
  { grade: "D+", minScore: 31, maxScore: 40, color: "#EA580C", description: "하위 — 신규 블로그에 비권장" },
  { grade: "D", minScore: 21, maxScore: 30, color: "#F97316", description: "하위 — 경쟁 매우 높음" },
  { grade: "D-", minScore: 0, maxScore: 20, color: "#EF4444", description: "최하위 — 진입 비권장" },
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
  { label: "낮음", maxRatio: 1.0, score: 80, color: "#22C55E" }, // 0.5 ≤ ratio < 1.0
  { label: "보통", maxRatio: 0.5, score: 60, color: "#EAB308" }, // 0.1 ≤ ratio < 0.5
  { label: "높음", maxRatio: 0.1, score: 35, color: "#EA580C" }, // 0.01 ≤ ratio < 0.1
  { label: "매우 높음", maxRatio: 0.01, score: 10, color: "#EF4444" }, // ratio < 0.01
] as const;

/** Helper: classify a saturation ratio into its threshold bucket */
export function getSaturationThreshold(ratio: number): SaturationThreshold {
  for (let i = 1; i < SATURATION_THRESHOLDS.length; i++) {
    if (ratio >= SATURATION_THRESHOLDS[i].maxRatio) {
      return SATURATION_THRESHOLDS[i - 1];
    }
  }
  return SATURATION_THRESHOLDS[SATURATION_THRESHOLDS.length - 1];
}
