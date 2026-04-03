/**
 * Naver DataLab API client.
 * Base URL: https://openapi.naver.com/v1/datalab
 *
 * Authentication via X-Naver-Client-Id / X-Naver-Client-Secret headers.
 * Env vars: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
 */

import { withRetry } from "./retry";
import { getNaverAuthHeaders } from "./naver-auth";

const BASE_URL = "https://openapi.naver.com/v1/datalab";

// ---------------------------------------------------------------------------
// Daily quota counter (DataLab: 1,000 calls/day)
// ---------------------------------------------------------------------------

const DAILY_QUOTA = 1000;
const QUOTA_WARN = 800;
const QUOTA_BLOCK = 950;

const quotaState = {
  count: 0,
  date: new Date().toISOString().split("T")[0],
};

function checkAndIncrementQuota(): void {
  const today = new Date().toISOString().split("T")[0];
  if (quotaState.date !== today) {
    quotaState.count = 0;
    quotaState.date = today;
  }
  quotaState.count++;
  if (quotaState.count >= QUOTA_BLOCK) {
    throw new Error(`DataLab 일일 호출 한도에 근접했습니다. (${quotaState.count}/${DAILY_QUOTA})`);
  }
  if (quotaState.count >= QUOTA_WARN) {
    console.warn(`[datalab-quota] WARNING: ${quotaState.count}/${DAILY_QUOTA} calls used today`);
  }
}

/** Get current daily quota usage */
export function getDatalabQuotaUsage() {
  const today = new Date().toISOString().split("T")[0];
  if (quotaState.date !== today) return { count: 0, limit: DAILY_QUOTA };
  return { count: quotaState.count, limit: DAILY_QUOTA };
}

async function postDatalab<T>(path: string, body: unknown): Promise<T> {
  // Quota check runs once per call (outside withRetry callback)
  checkAndIncrementQuota();
  const url = `${BASE_URL}${path}`;
  return withRetry(async () => {
    const response = await fetch(url, {
      method: "POST",
      headers: getNaverAuthHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const err = new Error(
        `Naver DataLab API error ${response.status} ${response.statusText}: ${text}`
      ) as Error & { status: number };
      err.status = response.status;
      throw err;
    }
    return response.json() as Promise<T>;
  });
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface TrendDataPoint {
  /** Date string in YYYY-MM-DD (or YYYY-WW / YYYY-MM depending on timeUnit) */
  period: string;
  /** Relative search index 0–100 */
  ratio: number;
}

export interface SearchTrendResult {
  title: string;
  keywords: string[];
  data: TrendDataPoint[];
}

export interface SearchTrendResponse {
  results: SearchTrendResult[];
}

export interface ShoppingTrendResult {
  title: string;
  category: string[];
  data: TrendDataPoint[];
}

export interface ShoppingTrendResponse {
  results: ShoppingTrendResult[];
}

export interface ShoppingKeywordTrendResult {
  title: string;
  keywords: string[];
  data: TrendDataPoint[];
}

export interface ShoppingKeywordTrendResponse {
  results: ShoppingKeywordTrendResult[];
}

// ---------------------------------------------------------------------------
// Param types
// ---------------------------------------------------------------------------

export interface SearchTrendParams {
  keyword: string;
  startDate: string;
  endDate: string;
  timeUnit: "date" | "week" | "month";
  device?: string;
  gender?: string;
  ages?: string[];
}

export interface ShoppingTrendParams {
  category: string;
  startDate: string;
  endDate: string;
  timeUnit: string;
  device?: string;
  gender?: string;
  ages?: string[];
}

export interface ShoppingKeywordTrendParams {
  category: string;
  keyword: string;
  startDate: string;
  endDate: string;
  timeUnit: string;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Retrieve relative search trend data for a keyword from Naver DataLab.
 *
 * @param params.keyword    - Keyword to track
 * @param params.startDate  - Period start (YYYY-MM-DD)
 * @param params.endDate    - Period end (YYYY-MM-DD)
 * @param params.timeUnit   - Aggregation unit: "date" | "week" | "month"
 * @param params.device     - Optional device filter (pc | mo)
 * @param params.gender     - Optional gender filter (m | f)
 * @param params.ages       - Optional age group filters (e.g. ["1", "2"])
 */
export async function getSearchTrend(
  params: SearchTrendParams
): Promise<SearchTrendResponse> {
  const { keyword, startDate, endDate, timeUnit, device, gender, ages } =
    params;

  const body: Record<string, unknown> = {
    startDate,
    endDate,
    timeUnit,
    keywordGroups: [{ groupName: keyword, keywords: [keyword] }],
  };

  if (device !== undefined) body.device = device;
  if (gender !== undefined) body.gender = gender;
  if (ages !== undefined) body.ages = ages;

  return postDatalab<SearchTrendResponse>("/search", body);
}

/**
 * Retrieve relative trend data for a shopping category from Naver DataLab.
 *
 * @param params.category   - Shopping category code string
 * @param params.startDate  - Period start (YYYY-MM-DD)
 * @param params.endDate    - Period end (YYYY-MM-DD)
 * @param params.timeUnit   - Aggregation unit string
 * @param params.device     - Optional device filter
 * @param params.gender     - Optional gender filter
 * @param params.ages       - Optional age group filters
 */
export async function getShoppingTrend(
  params: ShoppingTrendParams
): Promise<ShoppingTrendResponse> {
  const { category, startDate, endDate, timeUnit, device, gender, ages } =
    params;

  const body: Record<string, unknown> = {
    startDate,
    endDate,
    timeUnit,
    category: [{ name: category, param: [category] }],
  };

  if (device !== undefined) body.device = device;
  if (gender !== undefined) body.gender = gender;
  if (ages !== undefined) body.ages = ages;

  return postDatalab<ShoppingTrendResponse>("/shopping/categories", body);
}

/**
 * Retrieve keyword trend data within a shopping category from Naver DataLab.
 *
 * @param params.category   - Shopping category code string
 * @param params.keyword    - Keyword to track within the category
 * @param params.startDate  - Period start (YYYY-MM-DD)
 * @param params.endDate    - Period end (YYYY-MM-DD)
 * @param params.timeUnit   - Aggregation unit string
 */
export async function getShoppingKeywordTrend(
  params: ShoppingKeywordTrendParams
): Promise<ShoppingKeywordTrendResponse> {
  const { category, keyword, startDate, endDate, timeUnit } = params;

  const body = {
    startDate,
    endDate,
    timeUnit,
    category,
    keyword: [{ name: keyword, param: [keyword] }],
  };

  return postDatalab<ShoppingKeywordTrendResponse>(
    "/shopping/category/keywords",
    body
  );
}

// ---------------------------------------------------------------------------
// Shopping Insight Demographics (device / gender / age)
// ---------------------------------------------------------------------------

export interface ShoppingDemoDataPoint {
  period: string;
  group: string;
  ratio: number;
}

export interface ShoppingDemoResponse {
  results: Array<{
    title: string;
    data: ShoppingDemoDataPoint[];
  }>;
}

interface ShoppingDemoParams {
  startDate: string;
  endDate: string;
  timeUnit: string;
  category: string;
  keyword?: string;
}

/**
 * Fetch shopping category device-split trend.
 * - Category-level: POST /shopping/category/device  (category as string)
 * - Keyword-level:  POST /shopping/category/keyword/device  (+ keyword string)
 */
export async function getShoppingDeviceTrend(
  params: ShoppingDemoParams
): Promise<ShoppingDemoResponse> {
  const body: Record<string, unknown> = {
    startDate: params.startDate,
    endDate: params.endDate,
    timeUnit: params.timeUnit,
    category: params.category,
  };
  if (params.keyword) {
    body.keyword = params.keyword;
    return postDatalab<ShoppingDemoResponse>("/shopping/category/keyword/device", body);
  }
  return postDatalab<ShoppingDemoResponse>("/shopping/category/device", body);
}

/**
 * Fetch shopping category gender-split trend.
 * - Category-level: POST /shopping/category/gender  (category as string)
 * - Keyword-level:  POST /shopping/category/keyword/gender  (+ keyword string)
 */
export async function getShoppingGenderTrend(
  params: ShoppingDemoParams
): Promise<ShoppingDemoResponse> {
  const body: Record<string, unknown> = {
    startDate: params.startDate,
    endDate: params.endDate,
    timeUnit: params.timeUnit,
    category: params.category,
  };
  if (params.keyword) {
    body.keyword = params.keyword;
    return postDatalab<ShoppingDemoResponse>("/shopping/category/keyword/gender", body);
  }
  return postDatalab<ShoppingDemoResponse>("/shopping/category/gender", body);
}

/**
 * Fetch shopping category age-split trend.
 * - Category-level: POST /shopping/category/age  (category as string)
 * - Keyword-level:  POST /shopping/category/keyword/age  (+ keyword string)
 */
export async function getShoppingAgeTrend(
  params: ShoppingDemoParams
): Promise<ShoppingDemoResponse> {
  const body: Record<string, unknown> = {
    startDate: params.startDate,
    endDate: params.endDate,
    timeUnit: params.timeUnit,
    category: params.category,
  };
  if (params.keyword) {
    body.keyword = params.keyword;
    return postDatalab<ShoppingDemoResponse>("/shopping/category/keyword/age", body);
  }
  return postDatalab<ShoppingDemoResponse>("/shopping/category/age", body);
}

// ---------------------------------------------------------------------------
// Batch search trend — 5 keywords per API call (80% quota savings)
// ---------------------------------------------------------------------------

/**
 * Fetch search trends for multiple keywords in batches of 5.
 * DataLab API supports up to 5 keywordGroups per request.
 * Each batch returns relative ratios within that batch.
 *
 * @returns Map of keyword → TrendDataPoint[]
 */
export async function getSearchTrendBatch(
  keywords: string[],
  params: { startDate: string; endDate: string; timeUnit: "date" | "week" | "month" }
): Promise<Map<string, TrendDataPoint[]>> {
  const result = new Map<string, TrendDataPoint[]>();
  const MAX_PER_BATCH = 5;

  // Build all batch requests
  const batches: string[][] = [];
  for (let i = 0; i < keywords.length; i += MAX_PER_BATCH) {
    batches.push(keywords.slice(i, i + MAX_PER_BATCH));
  }

  // Fire all batches in parallel (DataLab can handle concurrent requests within quota)
  const responses = await Promise.all(
    batches.map((batch) => {
      const keywordGroups = batch.map((kw) => ({
        groupName: kw,
        keywords: [kw],
      }));
      return postDatalab<SearchTrendResponse>("/search", {
        startDate: params.startDate,
        endDate: params.endDate,
        timeUnit: params.timeUnit,
        keywordGroups,
      });
    })
  );

  for (const response of responses) {
    for (const r of response.results) {
      result.set(r.title, r.data);
    }
  }

  return result;
}
