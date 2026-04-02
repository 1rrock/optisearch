/**
 * Naver DataLab API client.
 * Base URL: https://openapi.naver.com/v1/datalab
 *
 * Authentication via X-Naver-Client-Id / X-Naver-Client-Secret headers.
 * Env vars: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
 */

import { withRetry } from "./retry";

const BASE_URL = "https://openapi.naver.com/v1/datalab";

function getAuthHeaders(): HeadersInit {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing Naver API credentials: NAVER_CLIENT_ID and NAVER_CLIENT_SECRET must be set"
    );
  }

  return {
    "Content-Type": "application/json",
    "X-Naver-Client-Id": clientId,
    "X-Naver-Client-Secret": clientSecret,
  };
}

async function postDatalab<T>(path: string, body: unknown): Promise<T> {
  const url = `${BASE_URL}${path}`;
  return withRetry(async () => {
    const response = await fetch(url, {
      method: "POST",
      headers: getAuthHeaders(),
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
