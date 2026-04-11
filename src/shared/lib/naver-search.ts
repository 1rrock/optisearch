/**
 * Naver Search API client.
 * Base URL: https://openapi.naver.com/v1/search
 *
 * Authentication via X-Naver-Client-Id / X-Naver-Client-Secret headers.
 * Env vars: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
 */

import { withRetry } from "./retry";
import { getNaverAuthHeaders } from "./naver-auth";

const BASE_URL = "https://openapi.naver.com/v1/search";

/** Raw fetch without retry — shared by fetchSearch and no-retry callers. */
async function fetchSearchRaw<T>(path: string, timeoutMs = 8000): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: getNaverAuthHeaders(),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const err = new Error(
      `Naver Search API error ${response.status} ${response.statusText}: ${text}`
    ) as Error & { status: number };
    err.status = response.status;
    throw err;
  }
  return response.json() as Promise<T>;
}

async function fetchSearch<T>(path: string): Promise<T> {
  return withRetry(() => fetchSearchRaw<T>(path));
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface BlogSearchItem {
  title: string;
  link: string;
  description: string;
  bloggername: string;
  postdate: string;
}

export interface BlogSearchResponse {
  items: BlogSearchItem[];
  total: number;
  display: number;
}

export interface CafeSearchItem {
  title: string;
  link: string;
  description: string;
  cafename: string;
}

export interface CafeSearchResponse {
  items: CafeSearchItem[];
  total: number;
}

export interface KinSearchItem {
  title: string;
  link: string;
  description: string;
}

export interface KinSearchResponse {
  items: KinSearchItem[];
  total: number;
}

export interface ShoppingSearchItem {
  title: string;
  link: string;
  lprice: string;
  mallName: string;
}

export interface ShoppingSearchResponse {
  items: ShoppingSearchItem[];
  total: number;
}

export interface AdultCheckResponse {
  /** "1" = adult content, "0" = not adult */
  adult: string;
}

export interface TypoCorrectionResponse {
  /** Corrected query string, or empty string if no correction needed */
  errata: string;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Search Naver blog posts for the given query.
 * @param query - Search keyword
 * @param display - Number of results (default 7)
 */
export async function searchBlog(
  query: string,
  display?: number
): Promise<BlogSearchResponse> {
  const count = display ?? 7;
  const params = new URLSearchParams({
    query,
    display: String(count),
    sort: "sim",
  });
  return fetchSearch<BlogSearchResponse>(`/blog.json?${params}`);
}

/**
 * Search Naver cafe articles for the given query.
 * @param query - Search keyword
 * @param display - Number of results (default 10)
 */
export async function searchCafe(
  query: string,
  display?: number
): Promise<CafeSearchResponse> {
  const count = display ?? 10;
  const params = new URLSearchParams({ query, display: String(count) });
  return fetchSearch<CafeSearchResponse>(`/cafearticle.json?${params}`);
}

/**
 * Search Naver Knowledge-iN (지식iN) for the given query.
 * @param query - Search keyword
 * @param display - Number of results (default 10)
 */
export async function searchKin(
  query: string,
  display?: number
): Promise<KinSearchResponse> {
  const count = display ?? 10;
  const params = new URLSearchParams({ query, display: String(count) });
  return fetchSearch<KinSearchResponse>(`/kin.json?${params}`);
}

/**
 * Search Naver Shopping for the given query.
 * @param query - Search keyword
 * @param display - Number of results (default 10)
 */
export async function searchShopping(
  query: string,
  display?: number
): Promise<ShoppingSearchResponse> {
  const count = display ?? 10;
  const params = new URLSearchParams({ query, display: String(count) });
  return fetchSearch<ShoppingSearchResponse>(`/shop.json?${params}`);
}

/**
 * Check whether a query is classified as adult content.
 * @param query - Search keyword
 * @returns `{ adult: "1" }` if adult, `{ adult: "0" }` if not
 */
export async function checkAdult(query: string): Promise<AdultCheckResponse> {
  const params = new URLSearchParams({ query });
  return fetchSearch<AdultCheckResponse>(`/adult.json?${params}`);
}

/**
 * Return a typo-corrected version of the query.
 * @param query - Search keyword (possibly misspelled)
 * @returns `{ errata: "<corrected>" }` or `{ errata: "" }` if no correction
 */
export async function correctTypo(
  query: string
): Promise<TypoCorrectionResponse> {
  const params = new URLSearchParams({ query });
  return fetchSearch<TypoCorrectionResponse>(`/errata.json?${params}`);
}

// ---------------------------------------------------------------------------
// News Search
// ---------------------------------------------------------------------------

export interface NewsSearchItem {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
}

export interface NewsSearchResponse {
  items?: NewsSearchItem[];
  total: number;
  display: number;
}

/**
 * Search Naver news articles for the given query.
 * @param query - Search keyword
 * @param display - Number of results (default 10, max 100)
 * @param sort - Sort order: "date" (recent) | "sim" (relevance, default)
 */
export async function searchNews(
  query: string,
  display?: number,
  sort?: "date" | "sim"
): Promise<NewsSearchResponse> {
  const params = new URLSearchParams({
    query,
    display: String(display ?? 10),
    sort: sort ?? "date",
  });
  return fetchSearch<NewsSearchResponse>(`/news.json?${params}`);
}

/**
 * Search Naver news WITHOUT retry logic.
 * Designed for cron-job bulk enrichment where retries would risk timeout.
 * Uses a 5-second hard timeout and throws on any error.
 *
 * @param query - Search keyword
 * @param display - Number of results (default 1)
 * @param sort - Sort order: "date" (recent) | "sim" (relevance)
 */
export async function searchNewsNoRetry(
  query: string,
  display?: number,
  sort?: "date" | "sim"
): Promise<NewsSearchResponse> {
  const params = new URLSearchParams({
    query,
    display: String(display ?? 1),
    sort: sort ?? "date",
  });
  return fetchSearchRaw<NewsSearchResponse>(`/news.json?${params}`, 5000);
}

// ---------------------------------------------------------------------------
// Web Document Search
// ---------------------------------------------------------------------------

export interface WebSearchItem {
  title: string;
  link: string;
  description: string;
}

export interface WebSearchResponse {
  items: WebSearchItem[];
  total: number;
  display: number;
}

/**
 * Search Naver web documents for the given query.
 * @param query - Search keyword
 * @param display - Number of results (default 10, max 100)
 */
export async function searchWeb(
  query: string,
  display?: number
): Promise<WebSearchResponse> {
  const params = new URLSearchParams({
    query,
    display: String(display ?? 10),
  });
  return fetchSearch<WebSearchResponse>(`/webkr.json?${params}`);
}

// ---------------------------------------------------------------------------
// Encyclopedia Search
// ---------------------------------------------------------------------------

export interface EncycSearchItem {
  title: string;
  link: string;
  description: string;
  thumbnail: string;
}

export interface EncycSearchResponse {
  items: EncycSearchItem[];
  total: number;
  display: number;
}

/**
 * Search Naver encyclopedia for the given query.
 * Used to detect "encyclopedia wall" — keywords where encyclopedia results
 * dominate top rankings, making blog SEO harder.
 * @param query - Search keyword
 * @param display - Number of results (default 5)
 */
export async function searchEncyclopedia(
  query: string,
  display?: number
): Promise<EncycSearchResponse> {
  const params = new URLSearchParams({
    query,
    display: String(display ?? 5),
  });
  return fetchSearch<EncycSearchResponse>(`/encyc.json?${params}`);
}

// ---------------------------------------------------------------------------
// Naver Autocomplete (unofficial — may be blocked without notice)
// ---------------------------------------------------------------------------

/**
 * Fetch autocomplete suggestions from Naver's unofficial autocomplete API.
 * Returns an array of suggested keywords. Returns [] on any failure.
 *
 * WARNING: This is an unofficial, unauthenticated endpoint.
 * It may be blocked or changed without notice.
 */
export async function getAutocompleteSuggestions(keyword: string): Promise<string[]> {
  if (!keyword.trim()) return [];
  try {
    const params = new URLSearchParams({
      q: keyword,
      con: "1",
      frm: "nv",
      ans: "2",
      r_format: "json",
      r_enc: "UTF-8",
      r_unicode: "0",
      t_koreng: "1",
      q_enc: "UTF-8",
      st: "100",
      q_gen: "0",
    });
    const response = await fetch(
      `https://ac.search.naver.com/nx/ac?${params}`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (!response.ok) return [];

    const text = await response.text();
    if (text.length > 50_000) return [];
    const data = JSON.parse(text);

    // Validate response structure
    if (!data?.items?.[0] || !Array.isArray(data.items[0])) return [];

    const normalizedKeyword = keyword.trim().replace(/\s+/g, " ").toLowerCase();
    return data.items[0]
      .map((item: string[]) => item?.[0])
      .filter((s: unknown): s is string =>
        typeof s === "string" && s.trim().replace(/\s+/g, " ").toLowerCase() !== normalizedKeyword
      );
  } catch {
    return [];
  }
}
