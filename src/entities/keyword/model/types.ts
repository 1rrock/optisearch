import type { KeywordGrade } from "@/shared/model/keyword-grade";
export type { KeywordGrade };

/**
 * Keyword entity types — shared across features.
 * These types mirror the keyword_searches table columns and derived analytics.
 */

// ---------------------------------------------------------------------------
// Grade / Saturation
// ---------------------------------------------------------------------------

/** Competition level returned by Naver SearchAd API */
export type CompetitionLevel = "낮음" | "중간" | "높음";
export type ProfitSignal = "HIGH" | "MEDIUM" | "LOW";

/**
 * Content saturation index.
 * Derived from: total search volume / blog post count.
 * Lower = less saturated = easier to rank.
 */
export interface SaturationIndex {
  /** Raw ratio value (search volume ÷ blog post count) */
  value: number;
  /** Human-readable label for the saturation bucket */
  label: "매우 낮음" | "낮음" | "보통" | "높음" | "매우 높음";
  /** 0–100 normalised score (100 = easiest to rank) */
  score: number;
}

// ---------------------------------------------------------------------------
// Core search result
// ---------------------------------------------------------------------------

/**
 * Full keyword analysis result, matching keyword_searches table columns
 * plus derived fields that are computed server-side before storage.
 */
export interface KeywordSearchResult {
  /** Naver SearchAd keyword string */
  keyword: string;
  /** PC monthly search volume */
  pcSearchVolume: number;
  /** Mobile monthly search volume */
  mobileSearchVolume: number;
  /** Combined (PC + mobile) total search volume */
  totalSearchVolume: number;
  /** Competition level from Naver SearchAd API */
  competition: CompetitionLevel;
  /** Estimated click-through rate (0–1) */
  clickRate: number;
  /** Number of blog posts indexed in Naver search for this keyword */
  blogPostCount: number;
  /** Derived content saturation analysis */
  saturationIndex: SaturationIndex;
  /** Derived composite keyword grade */
  keywordGrade: KeywordGrade;
  /** Section breakdown stored as jsonb in DB */
  sectionData: SectionAnalysis | null;
  /** Top-7 popular posts stored as jsonb in DB */
  topPosts: TopPost[] | null;
  /** Shopping insight data stored as jsonb in DB */
  shoppingData: ShoppingInsight | null;
  /** Timestamp from keyword_searches.created_at */
  createdAt: string;
  /** True when search volume was estimated via DataLab reverse-calculation (censored keywords) */
  isEstimated?: boolean;
  /** Confidence level for estimated volumes (high/medium/low based on anchor CV) */
  confidence?: "high" | "medium" | "low";
  /** Estimated monthly click count (PC + Mobile) derived from SearchAd CTR data */
  estimatedClicks?: number;
  profitSignal?: ProfitSignal;
}

// ---------------------------------------------------------------------------
// Related keywords
// ---------------------------------------------------------------------------

/** Single related / expanded keyword entry from Naver SearchAd relKeyword */
export interface RelatedKeyword {
  keyword: string;
  pcSearchVolume: number;
  mobileSearchVolume: number;
  competition: CompetitionLevel;
  keywordGrade: KeywordGrade;
  /** Real saturation data from blog post count lookup (optional for backwards compat) */
  saturationIndex?: SaturationIndex;
}

// ---------------------------------------------------------------------------
// Top posts (인기글 TOP7)
// ---------------------------------------------------------------------------

/** A single popular blog post from Naver Search API /search/blog */
export interface TopPost {
  /** Blog post title (may contain Naver highlight tags) */
  title: string;
  /** Short description / snippet */
  description: string;
  /** Canonical post URL */
  link: string;
  /** Blog name */
  bloggerName: string;
  /** Post publish date (YYYYMMDD string from API) */
  postdate: string;
}

// ---------------------------------------------------------------------------
// Section analysis (섹션 분석)
// ---------------------------------------------------------------------------

/** Result counts for a single Naver section */
export interface SectionCount {
  /** Total documents found in this section */
  total: number;
  /** Whether the section is visible in search results */
  isVisible: boolean;
}

/** Breakdown of Naver search result sections for a keyword */
export interface SectionAnalysis {
  blog: SectionCount;
  cafe: SectionCount;
  kin: SectionCount; // 지식iN
  shopping: SectionCount;
  news?: SectionCount;
}

// ---------------------------------------------------------------------------
// Shopping insight (쇼핑 인사이트)
// ---------------------------------------------------------------------------

/** Shopping insight entry for a single keyword/category */
export interface ShoppingInsight {
  /** Top 20 popular shopping keywords */
  topKeywords: Array<{
    keyword: string;
    rank: number;
  }>;
  /** Category path string, e.g. "패션의류 > 여성의류" */
  category: string;
}

// ---------------------------------------------------------------------------
// Compare
// ---------------------------------------------------------------------------

/** Side-by-side comparison of multiple keywords */
export interface KeywordCompareData {
  keywords: KeywordSearchResult[];
  /** Which keyword index (0-based) has the best grade */
  bestGradeIndex: number;
  /** Which keyword index has the highest total search volume */
  highestVolumeIndex: number;
}
