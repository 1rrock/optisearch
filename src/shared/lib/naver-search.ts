/**
 * Naver Search API client.
 * Base URL: https://openapi.naver.com/v1/search
 *
 * Authentication via X-Naver-Client-Id / X-Naver-Client-Secret headers.
 * Env vars: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
 */

import { withRetry } from "./retry";

const BASE_URL = "https://openapi.naver.com/v1/search";

function getAuthHeaders(): HeadersInit {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing Naver API credentials: NAVER_CLIENT_ID and NAVER_CLIENT_SECRET must be set"
    );
  }

  return {
    "X-Naver-Client-Id": clientId,
    "X-Naver-Client-Secret": clientSecret,
  };
}

async function fetchSearch<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path}`;
  return withRetry(async () => {
    const response = await fetch(url, { headers: getAuthHeaders() });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const err = new Error(
        `Naver Search API error ${response.status} ${response.statusText}: ${text}`
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
