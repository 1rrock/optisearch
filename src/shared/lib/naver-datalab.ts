/**
 * Naver DataLab API client.
 * Base URL: https://openapi.naver.com/v1/datalab
 *
 * Authentication via X-Naver-Client-Id / X-Naver-Client-Secret headers.
 * Env vars: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
 */

import { withRetry } from "./retry";
import { getNaverAuthHeaders } from "./naver-auth";
import { getRedis } from "./redis";

const BASE_URL = "https://openapi.naver.com/v1/datalab";

// ---------------------------------------------------------------------------
// Daily quota counter (DataLab: 1,000 calls/day)
// ---------------------------------------------------------------------------

const DAILY_QUOTA = 1000;
const QUOTA_WARN = 800;
const QUOTA_BLOCK = 950;

// In-memory fallback (used when Redis is unavailable)
const quotaState = {
  count: 0,
  date: new Date().toISOString().split("T")[0],
};

// Lua script: atomic INCR + conditional EXPIRE (no race window)
const QUOTA_INCR_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return count
`;

async function checkAndIncrementQuota(): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const redis = getRedis();

  if (redis) {
    try {
      const key = `datalab:quota:${today}`;
      const count = (await redis.eval(
        QUOTA_INCR_SCRIPT,
        [key],
        [86400]
      )) as number;

      if (count >= QUOTA_BLOCK) {
        throw new Error(`DataLab 일일 호출 한도에 근접했습니다. (${count}/${DAILY_QUOTA})`);
      }
      if (count >= QUOTA_WARN) {
        console.warn(`[datalab-quota] WARNING: ${count}/${DAILY_QUOTA} calls used today`);
      }
      return;
    } catch (err) {
      // Re-throw quota exceeded errors; fall back to in-memory for Redis failures
      if (err instanceof Error && err.message.startsWith("DataLab 일일")) throw err;
      console.warn("[datalab-quota] Redis unavailable, using in-memory fallback:", err);
    }
  }

  // In-memory fallback
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
export async function getDatalabQuotaUsage(): Promise<{ count: number; limit: number }> {
  const today = new Date().toISOString().split("T")[0];
  const redis = getRedis();

  if (redis) {
    try {
      const key = `datalab:quota:${today}`;
      const val = await redis.get<number>(key);
      return { count: val ?? 0, limit: DAILY_QUOTA };
    } catch {
      // Fall through to in-memory
    }
  }

  if (quotaState.date !== today) return { count: 0, limit: DAILY_QUOTA };
  return { count: quotaState.count, limit: DAILY_QUOTA };
}

async function postDatalab<T>(path: string, body: unknown): Promise<T> {
  // Quota check runs once per call (outside withRetry callback)
  await checkAndIncrementQuota();
  const url = `${BASE_URL}${path}`;
  // DataLab 429 means daily quota exceeded — retrying wastes quota
  return withRetry(async () => {
    const response = await fetch(url, {
      method: "POST",
      headers: getNaverAuthHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
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
  }, { maxRetries: 0 });
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
// Censored keyword volume estimation via DataLab reverse-calculation
// ---------------------------------------------------------------------------

/** Tiered reference keywords with known stable search volumes from SearchAd (~5K / ~30K / ~100K / ~500K) */
const REFERENCE_POOL = ["볼보", "제주도맛집", "날씨", "로또"];

/** Cached reference keyword volumes (Map-based, singleton promise pattern) */
const refVolumeCache = new Map<string, { pc: number; mobile: number; fetchedAt: number }>();
let refVolumePending: Promise<void> | null = null;
const REF_CACHE_TTL = 24 * 60 * 60 * 1000;

/** Moving average period in months for seasonality correction */
const MOVING_AVG_MONTHS = 3;

/** DataLab API allows max 5 keyword groups per request (target + references) */
const MAX_DATALAB_GROUPS = 5;

export interface EstimatedVolume {
  pcSearchVolume: number;
  mobileSearchVolume: number;
  totalSearchVolume: number;
  isEstimated: true;
}

/**
 * Calculate moving average of DataLab ratios, excluding months with ratio=0
 * to prevent under-estimation from censored/missing data points.
 */
function calcMovingAverage(data: TrendDataPoint[], months: number): number {
  const recent = data.slice(-months).filter(d => d.ratio > 0);
  if (recent.length === 0) return 0;
  return recent.reduce((sum, d) => sum + d.ratio, 0) / recent.length;
}

/**
 * Select the best reference keyword by finding the one with the most stable
 * proportional relationship (lowest coefficient of variation) to the target.
 * Skips months where either ratio is 0 to avoid division-by-zero.
 * Requires at least 3 valid data points per reference.
 */
function selectBestReference(
  targetData: TrendDataPoint[],
  refResults: { keyword: string; data: TrendDataPoint[] }[]
): { keyword: string; data: TrendDataPoint[] } | null {
  let bestRef: (typeof refResults)[0] | null = null;
  let bestCV = Infinity;

  for (const ref of refResults) {
    // Build pairs by matching on period string (not index) to handle misaligned data
    const refMap = new Map(ref.data.map(d => [d.period, d.ratio]));
    const pairs = targetData
      .map(t => ({ t: t.ratio, r: refMap.get(t.period) ?? 0 }))
      .filter(p => p.t > 0 && p.r > 0);

    // Require at least 3 valid months for meaningful CV
    if (pairs.length < 3) continue;

    const ratios = pairs.map(p => p.t / p.r);
    const mean = ratios.reduce((s, v) => s + v, 0) / ratios.length;
    if (mean === 0) continue;

    const variance = ratios.reduce((s, v) => s + (v - mean) ** 2, 0) / ratios.length;
    const cv = Math.sqrt(variance) / mean;

    if (cv < bestCV) {
      bestCV = cv;
      bestRef = ref;
    }
  }

  return bestRef;
}

/**
 * Ensure all reference keyword volumes are loaded and cached.
 * Uses singleton promise pattern to prevent concurrent fetches.
 */
async function ensureRefVolumesLoaded(
  getVolumes: (keywords: string[]) => Promise<Map<string, { pc: number; mobile: number }>>
): Promise<boolean> {
  const now = Date.now();
  const allFresh = REFERENCE_POOL.every(ref => {
    const cached = refVolumeCache.get(ref);
    return cached && now - cached.fetchedAt < REF_CACHE_TTL;
  });
  if (allFresh) return true;

  if (!refVolumePending) {
    refVolumePending = (async () => {
      const staleKeywords = REFERENCE_POOL
        .filter(ref => {
          const cached = refVolumeCache.get(ref);
          return !cached || Date.now() - cached.fetchedAt >= REF_CACHE_TTL;
        });

      const volumes = await getVolumes(staleKeywords);
      for (const [kw, vol] of volumes) {
        if (vol.pc > 0 || vol.mobile > 0) {
          refVolumeCache.set(kw, { ...vol, fetchedAt: Date.now() });
        }
      }
    })().finally(() => { refVolumePending = null; });
  }

  try { await refVolumePending; } catch { return false; }

  // Verify at least one reference has a non-stale cache entry
  return REFERENCE_POOL.some(ref => {
    const cached = refVolumeCache.get(ref);
    return cached && Date.now() - cached.fetchedAt < REF_CACHE_TTL;
  });
}

/**
 * Estimate search volume for a keyword that SearchAd reports as 0 (censored).
 * Uses tiered multi-reference system with 3-month moving average for accuracy.
 *
 * Algorithm:
 * 1. Load reference keyword volumes from SearchAd (cached 24h)
 * 2. Call DataLab with target + 4 reference keywords (1 API call, 5 groups)
 * 3. Select best reference by coefficient of variation (most stable ratio)
 * 4. Calculate 3-month moving average for seasonality correction
 * 5. Estimate target volume using scale factor from best reference
 *
 * DataLab cost: 1 call (+ 0–1 for reference keywords SearchAd lookup, cached 24h).
 * Returns null if estimation is not possible.
 */
export async function estimateVolumeFromDataLab(
  targetKeyword: string,
  getRefVolumes: (keywords: string[]) => Promise<Map<string, { pc: number; mobile: number }>>
): Promise<EstimatedVolume | null> {
  // 1. Load reference keyword volumes (cached, singleton promise)
  const loaded = await ensureRefVolumesLoaded(getRefVolumes);
  if (!loaded) {
    console.warn("[datalab] Failed to load reference keyword volumes");
    return null;
  }

  // 2. Call DataLab with target + all reference keywords (1 call, 5 groups max)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 12);
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  try {
    // Guard: DataLab allows max 5 groups; use at most (MAX_DATALAB_GROUPS - 1) references
    const refsToUse = REFERENCE_POOL.slice(0, MAX_DATALAB_GROUPS - 1);

    const response = await postDatalab<SearchTrendResponse>("/search", {
      startDate: fmt(startDate),
      endDate: fmt(endDate),
      timeUnit: "month",
      keywordGroups: [
        { groupName: "target", keywords: [targetKeyword] },
        ...refsToUse.map((ref, i) => ({
          groupName: `ref${i}`,
          keywords: [ref],
        })),
      ],
    });

    const targetResult = response.results.find((r) => r.title === "target");
    if (!targetResult?.data?.length) return null;

    // Build reference results array (only those with cached volumes)
    const refResults = refsToUse
      .map((ref, i) => {
        const result = response.results.find((r) => r.title === `ref${i}`);
        return result?.data?.length ? { keyword: ref, data: result.data } : null;
      })
      .filter((r): r is { keyword: string; data: TrendDataPoint[] } => r !== null);

    if (refResults.length === 0) {
      console.warn("[datalab] No valid reference data from DataLab for:", targetKeyword);
      return null;
    }

    // 3. Select best reference by CV (coefficient of variation)
    const bestRef = selectBestReference(targetResult.data, refResults);
    if (!bestRef) {
      console.warn("[datalab] No suitable reference found for:", targetKeyword);
      return null;
    }

    // 4. Calculate 3-month moving average for both target and reference
    const targetAvg = calcMovingAverage(targetResult.data, MOVING_AVG_MONTHS);
    const refAvg = calcMovingAverage(bestRef.data, MOVING_AVG_MONTHS);
    if (refAvg === 0 || targetAvg === 0) return null;

    // 5. Estimate using scale factor
    const refVolume = refVolumeCache.get(bestRef.keyword);
    if (!refVolume) {
      console.warn("[datalab] Reference volume cache miss for:", bestRef.keyword);
      return null;
    }

    const scale = targetAvg / refAvg;
    const estPc = Math.round(refVolume.pc * scale);
    const estMobile = Math.round(refVolume.mobile * scale);

    return {
      pcSearchVolume: estPc,
      mobileSearchVolume: estMobile,
      totalSearchVolume: estPc + estMobile,
      isEstimated: true,
    };
  } catch (err) {
    console.warn("[datalab] Volume estimation failed:", err instanceof Error ? err.message : err);
    return null;
  }
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
