import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { createServerClient } from "@/shared/lib/supabase";
import { checkRateLimit } from "@/shared/lib/rate-limit";
import { getKSTDateString } from "@/shared/lib/date-utils";
import { getRedis } from "@/shared/lib/redis";

export interface NewKeywordItem {
  keyword: string;
  volume: number;
}

export interface NewKeywordDateColumn {
  date: string;
  label: string;
  dayOfWeek: string;
  keywords: NewKeywordItem[];
}

export interface NewKeywordsResponse {
  dates: NewKeywordDateColumn[];
  totalCount: number;
  source: "corpus" | "searches";
}

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * GET /api/keywords/new?days=7&date=2026-04-03
 *
 * Returns newly discovered keywords grouped by date (BlackKiwi style).
 * Primary source: keyword_corpus (SearchAd daily polling).
 * Fallback: keyword_searches (user search history).
 */
export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const rateLimitResult = await checkRateLimit(user.userId);
  if (!rateLimitResult.allowed) {
    return Response.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") ?? "7", 10) || 7, 30);
  const dateParam = searchParams.get("date"); // optional: center date

  try {
    const result = await fetchNewKeywords(days, dateParam);
    return Response.json(result);
  } catch (err) {
    console.error("[api/keywords/new] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

/**
 * Reads verified new keywords from Redis for each date in range.
 * Returns partial results (per-day hybrid): dates present in Redis use cached data,
 * dates missing from Redis are returned with empty keywords so callers can fill them
 * from DB if needed. Returns null only when Redis is unavailable.
 */
async function fetchFromRedis(
  days: number,
  endDate: Date
): Promise<{ columns: NewKeywordDateColumn[]; missingDates: string[] } | null> {
  const redis = getRedis();
  if (!redis) return null;

  const columns: NewKeywordDateColumn[] = [];
  const missingDates: string[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    const dateStr = getKSTDateString(d);
    const kstD = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    const dayOfWeek = DAY_NAMES[kstD.getUTCDay()];

    try {
      const cached = await redis.get<string>(`new-keywords:verified:${dateStr}`);
      if (cached === null) {
        missingDates.push(dateStr);
        columns.push({ date: dateStr, label: `${dateStr} ${dayOfWeek}`, dayOfWeek, keywords: [] });
      } else {
        const keywords: Array<{ keyword: string; volume: number }> =
          typeof cached === "string" ? JSON.parse(cached) : cached;
        columns.push({ date: dateStr, label: `${dateStr} ${dayOfWeek}`, dayOfWeek, keywords });
      }
    } catch {
      missingDates.push(dateStr);
      columns.push({ date: dateStr, label: `${dateStr} ${dayOfWeek}`, dayOfWeek, keywords: [] });
    }
  }

  return { columns, missingDates };
}

async function fetchNewKeywords(
  days: number,
  centerDate: string | null
): Promise<NewKeywordsResponse> {
  // Determine date range
  const endDate = centerDate ? new Date(centerDate + "T23:59:59") : new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days + 1);

  const startStr = formatDateISO(startDate);
  const endStr = formatDateISO(endDate);

  // Redis first — per-day hybrid: use cached data where available, DB for missing dates
  const redisResult = await fetchFromRedis(days, endDate);
  if (redisResult) {
    const { columns, missingDates } = redisResult;

    if (missingDates.length === 0) {
      // All days cached — return Redis data directly
      return { dates: columns, totalCount: columns.reduce((s, c) => s + c.keywords.length, 0), source: "corpus" };
    }

    // Fill missing dates from DB corpus
    const corpusFull = await fetchFromCorpus(startStr, endStr, days, endDate);
    if (corpusFull) {
      const dbMap = new Map(corpusFull.dates.map((col) => [col.date, col]));
      const merged = columns.map((col) =>
        col.keywords.length === 0 && dbMap.has(col.date) ? dbMap.get(col.date)! : col
      );
      return { dates: merged, totalCount: merged.reduce((s, c) => s + c.keywords.length, 0), source: "corpus" };
    }
  }

  // Full DB fallback
  const corpusResult = await fetchFromCorpus(startStr, endStr, days, endDate);
  if (corpusResult) return corpusResult;

  // Last resort: keyword_searches
  return fetchFromSearches(startStr, endStr, days, endDate);
}

async function fetchFromCorpus(
  startStr: string,
  endStr: string,
  days: number,
  endDate: Date
): Promise<NewKeywordsResponse | null> {
  const supabase = await createServerClient();

  // Query per-date in parallel to avoid Supabase 1000-row default limit
  const PER_DATE_LIMIT = 500;

  const queries = Array.from({ length: days }, (_, i) => {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    return supabase
      .from("keyword_corpus")
      .select("keyword, pc_volume, mobile_volume, first_seen_at")
      .eq("first_seen_at", formatDateISO(d))
      .order("total_volume", { ascending: false })
      .limit(PER_DATE_LIMIT);
  });

  const results = await Promise.all(queries);

  // Check first result for table existence
  if (results[0].error) {
    console.warn("[new-keywords] corpus query failed:", results[0].error.message);
    return null;
  }

  const allItems: Array<{ keyword: string; volume: number; date: string }> = [];
  for (const { data } of results) {
    if (data) {
      for (const row of data as Array<{ keyword: string; pc_volume: number; mobile_volume: number; first_seen_at: string }>) {
        allItems.push({
          keyword: row.keyword,
          volume: (row.pc_volume ?? 0) + (row.mobile_volume ?? 0),
          date: getKSTDateString(row.first_seen_at),
        });
      }
    }
  }

  return buildResponse(allItems, days, endDate, "corpus");
}

// Intentionally queries all users' searches to identify globally trending keywords.
// This is NOT user-scoped because the feature shows community-wide trends.
async function fetchFromSearches(
  startStr: string,
  endStr: string,
  days: number,
  endDate: Date
): Promise<NewKeywordsResponse> {
  const supabase = await createServerClient();

  const { data } = await supabase
    .from("keyword_searches")
    .select("keyword, pc_search_volume, mobile_search_volume, created_at")
    .gte("created_at", startStr + "T00:00:00")
    .lte("created_at", endStr + "T23:59:59")
    .order("created_at", { ascending: true })
    .limit(1000);

  if (!data || data.length === 0) {
    return buildResponse([], days, endDate, "searches");
  }

  // Deduplicate: keep first occurrence of each keyword
  const seen = new Set<string>();
  const items: Array<{ keyword: string; volume: number; date: string }> = [];

  for (const row of data as Array<{ keyword: string; pc_search_volume: number; mobile_search_volume: number; created_at: string }>) {
    if (!seen.has(row.keyword)) {
      seen.add(row.keyword);
      items.push({
        keyword: row.keyword,
        volume: (row.pc_search_volume ?? 0) + (row.mobile_search_volume ?? 0),
        date: getKSTDateString(row.created_at),
      });
    }
  }

  return buildResponse(items, days, endDate, "searches");
}

function buildResponse(
  items: Array<{ keyword: string; volume: number; date: string }>,
  days: number,
  endDate: Date,
  source: "corpus" | "searches"
): NewKeywordsResponse {
  // Create date columns for each day
  const dateColumns: NewKeywordDateColumn[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    const dateStr = formatDateISO(d);
    const kstD = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    const dayOfWeek = DAY_NAMES[kstD.getUTCDay()];

    const dayKeywords = items
      .filter((item) => item.date === dateStr)
      .sort((a, b) => b.volume - a.volume)
      .map(({ keyword, volume }) => ({ keyword, volume }));

    dateColumns.push({
      date: dateStr,
      label: `${dateStr} ${dayOfWeek}`,
      dayOfWeek,
      keywords: dayKeywords,
    });
  }

  return {
    dates: dateColumns,
    totalCount: items.length,
    source,
  };
}

/** Format a Date object as KST YYYY-MM-DD (used for query date ranges) */
function formatDateISO(d: Date): string {
  return getKSTDateString(d);
}
