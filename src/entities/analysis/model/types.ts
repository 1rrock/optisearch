/**
 * Analysis entity types — AI results, trend data, demographics, and bulk analysis.
 * These types correspond to ai_usage feature values and derived analytics payloads.
 */

import type { KeywordGrade, KeywordSearchResult } from "@/entities/keyword/model/types";

// ---------------------------------------------------------------------------
// AI feature: title suggestion (제목 추천)
// ---------------------------------------------------------------------------

/** A single AI-generated title suggestion for a keyword */
export interface AITitleSuggestion {
  /** Generated blog post title */
  title: string;
  /** 1-based rank (1 = highest click-rate potential) */
  rank: number;
  /** Brief rationale for why this title was recommended */
  reason: string;
}

// ---------------------------------------------------------------------------
// AI feature: draft generation (글 초안)
// ---------------------------------------------------------------------------

/** AI-generated blog draft result */
export interface AIDraftResult {
  /** Target keyword the draft was created for */
  keyword: string;
  /** Suggested post title */
  suggestedTitle: string;
  /** Full draft content in markdown */
  content: string;
  /** Estimated word count */
  wordCount: number;
  /** Suggested heading structure for the post */
  outline: string[];
  /** Recommended tags to copy */
  tags: string[];
}

// ---------------------------------------------------------------------------
// AI feature: content score (콘텐츠 점수)
// ---------------------------------------------------------------------------

/** Sub-metric scores that make up the overall AI content score */
export interface AIContentSubMetrics {
  /** Keyword inclusion and natural placement (0-100) */
  keywordUsage: number;
  /** Readability and flow (0-100) */
  readability: number;
  /** Structure quality: headings, paragraphs, lists (0-100) */
  structure: number;
  /** Content depth and informativeness (0-100) */
  depth: number;
  /** Title attractiveness and click-worthiness (0-100) */
  titleAttractiveness: number;
}

/** Full AI content score result for a submitted blog post */
export interface AIContentScore {
  /** Composite score 0-100 */
  totalScore: number;
  /** Grade label derived from totalScore */
  grade: KeywordGrade;
  /** Breakdown by sub-metric */
  subMetrics: AIContentSubMetrics;
  /** Prioritised list of improvement suggestions */
  improvements: string[];
  /** Summary of strengths */
  strengths: string[];
}

// ---------------------------------------------------------------------------
// Trend data (데이터랩 트렌드)
// ---------------------------------------------------------------------------

/** A single data point in a trend series */
export interface TrendDataPoint {
  /** Date string in YYYY-MM-DD format */
  date: string;
  /** Relative search index 0–100 (NOT absolute search volume) */
  ratio: number;
}

/** Trend data for a single keyword from Naver DataLab API */
export interface TrendData {
  keyword: string;
  /** Time series of relative search index values */
  data: TrendDataPoint[];
  /** Start of the requested period (YYYY-MM-DD) */
  startDate: string;
  /** End of the requested period (YYYY-MM-DD) */
  endDate: string;
  /** Aggregation unit returned by DataLab */
  timeUnit: "date" | "week" | "month";
}

// ---------------------------------------------------------------------------
// Shopping insight (데이터랩 쇼핑인사이트)
// ---------------------------------------------------------------------------

/** Trend series for a shopping category or keyword */
export interface ShoppingInsightTrend {
  title: string;
  data: TrendDataPoint[];
}

/** Shopping insight response combining category trends and top keywords */
export interface ShoppingInsightResult {
  /** Shopping category path, e.g. "패션의류 > 여성의류" */
  category: string;
  /** Trend series for the requested period */
  trends: ShoppingInsightTrend[];
  /** Top 20 popular keywords in this category */
  topKeywords: Array<{
    rank: number;
    keyword: string;
  }>;
}

// ---------------------------------------------------------------------------
// Demographics (성별/연령)
// ---------------------------------------------------------------------------

/** Search ratio breakdown by gender */
export interface GenderData {
  /** Male ratio (0–100) */
  male: number;
  /** Female ratio (0–100) */
  female: number;
}

/** Search ratio for a single age group */
export interface AgeGroupData {
  /** Age group label, e.g. "10대", "20대" */
  group: string;
  /** Relative search ratio for this age group (0–100) */
  ratio: number;
}

/** Full demographic analysis for a keyword from Naver DataLab */
export interface DemographicData {
  keyword: string;
  gender: GenderData;
  ageGroups: AgeGroupData[];
}

// ---------------------------------------------------------------------------
// Bulk analysis (대량 키워드 분석)
// ---------------------------------------------------------------------------

/** Status of a single keyword in a bulk analysis job */
export type BulkKeywordStatus = "pending" | "success" | "error";

/** Result row for a single keyword in a bulk analysis run */
export interface BulkKeywordRow {
  keyword: string;
  status: BulkKeywordStatus;
  /** Populated when status is "success" */
  result?: Pick<
    KeywordSearchResult,
    | "pcSearchVolume"
    | "mobileSearchVolume"
    | "totalSearchVolume"
    | "competition"
    | "blogPostCount"
    | "saturationIndex"
    | "keywordGrade"
  >;
  /** Populated when status is "error" */
  errorMessage?: string;
}

/** Aggregated result for a bulk keyword analysis job */
export interface BulkAnalysisResult {
  /** Total keywords submitted */
  total: number;
  /** Successfully analysed count */
  successCount: number;
  /** Failed count */
  errorCount: number;
  /** Per-keyword rows */
  rows: BulkKeywordRow[];
  /** ISO timestamp when the analysis completed */
  completedAt: string;
}
