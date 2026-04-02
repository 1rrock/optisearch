/**
 * Naver SearchAd API client.
 * Server-side only — env vars are never exposed to the browser.
 * Authentication: HMAC-SHA256 over `${timestamp}.${METHOD}.${path}`
 */

import { createHmac } from "crypto";

// ---------------------------------------------------------------------------
// Raw API response types
// ---------------------------------------------------------------------------

/** Raw keyword entry returned by the Naver SearchAd /keywordstool endpoint. */
export interface NaverKeywordStatRaw {
  relKeyword: string;
  /** Monthly PC search volume — may be the string "< 10" for low-volume terms */
  monthlyPcQcCnt: number | "< 10";
  /** Monthly mobile search volume — may be the string "< 10" */
  monthlyMobileQcCnt: number | "< 10";
  /** Average monthly PC click count */
  monthlyAvePcClkCnt: number | "< 10";
  /** Average monthly mobile click count */
  monthlyAveMobileClkCnt: number | "< 10";
  /** Average PC click-through rate */
  monthlyAvePcCtr: number;
  /** Average mobile click-through rate */
  monthlyAveMobileCtr: number;
  /** Competition index: 낮음 | 중간 | 높음 */
  compIdx: string;
  /** Average ad placement depth */
  plAvgDepth: number;
}

/** Normalised keyword stat with all numeric fields guaranteed to be numbers. */
export interface NaverKeywordStat {
  relKeyword: string;
  monthlyPcQcCnt: number;
  monthlyMobileQcCnt: number;
  monthlyAvePcClkCnt: number;
  monthlyAveMobileClkCnt: number;
  monthlyAvePcCtr: number;
  monthlyAveMobileCtr: number;
  compIdx: string;
  plAvgDepth: number;
}

/** Shape of the /keywordstool response body */
interface KeywordToolResponse {
  keywordList: NaverKeywordStatRaw[];
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

const BASE_URL = "https://api.searchad.naver.com";

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

function buildSignature(
  timestamp: string,
  method: string,
  path: string,
  secretKey: string
): string {
  const message = `${timestamp}.${method}.${path}`;
  return createHmac("sha256", secretKey).update(message).digest("base64");
}

function buildHeaders(method: string, path: string): Record<string, string> {
  const timestamp = Date.now().toString();
  const accessLicense = getEnv("NAVER_SEARCHAD_ACCESS_LICENSE");
  const customerId = getEnv("NAVER_SEARCHAD_CUSTOMER_ID");
  const secretKey = getEnv("NAVER_SEARCHAD_SECRET_KEY");

  return {
    "Content-Type": "application/json; charset=UTF-8",
    "X-Timestamp": timestamp,
    "X-API-KEY": accessLicense,
    "X-Customer": customerId,
    "X-Signature": buildSignature(timestamp, method, path, secretKey),
  };
}

// ---------------------------------------------------------------------------
// Value normalisation
// ---------------------------------------------------------------------------

/** Convert "< 10" low-volume strings to 0; pass real numbers through. */
function toNumber(value: number | "< 10"): number {
  if (value === "< 10") return 0;
  return value;
}

function normalise(raw: NaverKeywordStatRaw): NaverKeywordStat {
  return {
    relKeyword: raw.relKeyword,
    monthlyPcQcCnt: toNumber(raw.monthlyPcQcCnt),
    monthlyMobileQcCnt: toNumber(raw.monthlyMobileQcCnt),
    monthlyAvePcClkCnt: toNumber(raw.monthlyAvePcClkCnt),
    monthlyAveMobileClkCnt: toNumber(raw.monthlyAveMobileClkCnt),
    monthlyAvePcCtr: raw.monthlyAvePcCtr,
    monthlyAveMobileCtr: raw.monthlyAveMobileCtr,
    compIdx: raw.compIdx,
    plAvgDepth: raw.plAvgDepth,
  };
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

/**
 * Fetch keyword statistics from the Naver SearchAd keyword tool.
 *
 * The API accepts at most 5 hint keywords per request. When `keywords` contains
 * more than 5 items the call will be made in batches and results merged.
 *
 * Rate limit: ~20-30 requests/second (no daily quota).
 */
export async function getKeywordStats(
  keywords: string[]
): Promise<NaverKeywordStat[]> {
  const MAX_PER_BATCH = 5;
  const results: NaverKeywordStat[] = [];

  for (let i = 0; i < keywords.length; i += MAX_PER_BATCH) {
    const batch = keywords.slice(i, i + MAX_PER_BATCH);
    // Signature is computed over the URI path only (no query string)
    const signaturePath = "/keywordstool";
    const queryString = `?hintKeywords=${encodeURIComponent(batch.join(","))}&showDetail=1`;

    const response = await fetch(`${BASE_URL}${signaturePath}${queryString}`, {
      method: "GET",
      headers: buildHeaders("GET", signaturePath),
    });

    if (!response.ok) {
      throw new Error(
        `Naver SearchAd API error: ${response.status} ${response.statusText}`
      );
    }

    const data: KeywordToolResponse = await response.json();
    results.push(...data.keywordList.map(normalise));
  }

  return results;
}

/**
 * Fetch related keywords for a single seed keyword.
 *
 * Returns the full `keywordList` from the API, which includes the seed keyword
 * itself as the first entry followed by all related keyword suggestions.
 */
export async function getRelatedKeywords(
  keyword: string
): Promise<NaverKeywordStat[]> {
  const signaturePath = "/keywordstool";
  const queryString = `?hintKeywords=${encodeURIComponent(keyword)}&showDetail=1`;

  const response = await fetch(`${BASE_URL}${signaturePath}${queryString}`, {
    method: "GET",
    headers: buildHeaders("GET", signaturePath),
  });

  if (!response.ok) {
    throw new Error(
      `Naver SearchAd API error: ${response.status} ${response.statusText}`
    );
  }

  const data: KeywordToolResponse = await response.json();
  return data.keywordList.map(normalise);
}
