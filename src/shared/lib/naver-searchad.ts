/**
 * Naver SearchAd API client.
 * Server-side only — env vars are never exposed to the browser.
 * Authentication: HMAC-SHA256 over `${timestamp}.${METHOD}.${path}`
 */

import { createHmac } from "crypto";
import { withRetry } from "./retry";

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

  // Build all batch requests
  const batches: string[][] = [];
  for (let i = 0; i < keywords.length; i += MAX_PER_BATCH) {
    batches.push(keywords.slice(i, i + MAX_PER_BATCH));
  }

  // Fire all batches in parallel (SearchAd: ~20-30 req/s, no daily limit)
  const batchResults = await Promise.all(
    batches.map((batch) => {
      const signaturePath = "/keywordstool";
      const queryString = `?hintKeywords=${encodeURIComponent(batch.join(","))}&showDetail=1`;

      return withRetry(async () => {
        const response = await fetch(
          `${BASE_URL}${signaturePath}${queryString}`,
          { method: "GET", headers: buildHeaders("GET", signaturePath) }
        );
        if (!response.ok) {
          const err = new Error(
            `Naver SearchAd API error: ${response.status} ${response.statusText}`
          ) as Error & { status: number };
          err.status = response.status;
          throw err;
        }
        return response.json() as Promise<KeywordToolResponse>;
      });
    })
  );

  return batchResults.flatMap((data) => data.keywordList.map(normalise));
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

  const data = await withRetry(async () => {
    const response = await fetch(`${BASE_URL}${signaturePath}${queryString}`, {
      method: "GET",
      headers: buildHeaders("GET", signaturePath),
    });
    if (!response.ok) {
      const err = new Error(
        `Naver SearchAd API error: ${response.status} ${response.statusText}`
      ) as Error & { status: number };
      err.status = response.status;
      throw err;
    }
    return response.json() as Promise<KeywordToolResponse>;
  });
  return data.keywordList.map(normalise);
}

// ---------------------------------------------------------------------------
// Estimate API — CPC / bid data
// ---------------------------------------------------------------------------

/** Result from POST /estimate/performance */
export interface EstimatePerformanceResult {
  keyword: string;
  bid: number;
  impressions: number;
  clicks: number;
  cost: number;
  avgCpc: number;
}

/** Result from GET /estimate/average-position-bid/keyword */
export interface AveragePositionBid {
  keyword: string;
  position: number;
  bid: number;
}

/** Result from GET /estimate/exposure-minimum-bid/keyword */
export interface ExposureMinimumBid {
  keyword: string;
  bid: number;
}

/**
 * Fetch estimated ad performance (impressions, clicks, CPC) for a keyword.
 *
 * @param keyword - Target keyword
 * @param device  - Device type: PC | MOBILE
 * @param bid     - Optional bid amount. If omitted, uses 500 KRW default.
 */
export async function getEstimatePerformance(
  keyword: string,
  device: "PC" | "MOBILE" = "PC",
  bid: number = 500
): Promise<EstimatePerformanceResult | null> {
  const signaturePath = "/estimate/performance";
  const body = {
    device,
    keywordplus: false,
    key: keyword,
    bids: [bid],
  };

  try {
    const data = await withRetry(async () => {
      const response = await fetch(`${BASE_URL}${signaturePath}`, {
        method: "POST",
        headers: buildHeaders("POST", signaturePath),
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const err = new Error(
          `SearchAd Estimate API error: ${response.status}`
        ) as Error & { status: number };
        err.status = response.status;
        throw err;
      }
      return response.json();
    });

    // API returns an estimate object or array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const estimate = Array.isArray(data) ? data[0] : data;
    if (!estimate) return null;

    return {
      keyword,
      bid: estimate.bid ?? bid,
      impressions: estimate.impressions ?? 0,
      clicks: estimate.clicks ?? 0,
      cost: estimate.cost ?? 0,
      avgCpc: estimate.clicks > 0
        ? Math.round((estimate.cost ?? 0) / estimate.clicks)
        : 0,
    };
  } catch (err) {
    console.warn(`[searchad] Estimate performance failed for "${keyword}":`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Fetch the minimum bid required for ad exposure.
 *
 * @param keyword - Target keyword
 */
export async function getExposureMinimumBid(
  keyword: string
): Promise<ExposureMinimumBid | null> {
  const signaturePath = "/estimate/exposure-minimum-bid/keyword";
  const queryString = `?keyword=${encodeURIComponent(keyword)}`;

  try {
    const data = await withRetry(async () => {
      const response = await fetch(`${BASE_URL}${signaturePath}${queryString}`, {
        method: "GET",
        headers: buildHeaders("GET", signaturePath),
      });
      if (!response.ok) {
        const err = new Error(
          `SearchAd MinBid API error: ${response.status}`
        ) as Error & { status: number };
        err.status = response.status;
        throw err;
      }
      return response.json();
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = Array.isArray(data) ? data[0] : data;
    if (!result) return null;

    return {
      keyword,
      bid: result.bid ?? 0,
    };
  } catch (err) {
    console.warn(`[searchad] MinBid failed for "${keyword}":`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Fetch average position bids for a keyword (positions 1-5).
 *
 * @param keyword - Target keyword
 */
export async function getAveragePositionBid(
  keyword: string
): Promise<AveragePositionBid[]> {
  const signaturePath = "/estimate/average-position-bid/keyword";
  const queryString = `?keyword=${encodeURIComponent(keyword)}`;

  try {
    const data = await withRetry(async () => {
      const response = await fetch(`${BASE_URL}${signaturePath}${queryString}`, {
        method: "GET",
        headers: buildHeaders("GET", signaturePath),
      });
      if (!response.ok) {
        const err = new Error(
          `SearchAd PositionBid API error: ${response.status}`
        ) as Error & { status: number };
        err.status = response.status;
        throw err;
      }
      return response.json();
    });

    // API returns array of position-bid pairs
    if (!Array.isArray(data)) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((item: any) => ({
      keyword,
      position: item.position ?? 0,
      bid: item.bid ?? 0,
    }));
  } catch (err) {
    console.warn(`[searchad] PositionBid failed for "${keyword}":`, err instanceof Error ? err.message : err);
    return [];
  }
}
