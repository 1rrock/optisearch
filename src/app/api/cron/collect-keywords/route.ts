import { timingSafeEqual as _tse } from "node:crypto";
import { createServerClient } from "@/shared/lib/supabase";
import { getRelatedKeywords } from "@/shared/lib/naver-searchad";
import { getAllTrendingSeeds } from "@/shared/config/trending-seeds";
import { getSeasonalSeeds } from "@/shared/config/seasonal-keywords";

/**
 * Vercel Cron job — runs daily to collect keywords from SearchAd API.
 *
 * For each seed keyword, calls getRelatedKeywords() and upserts results
 * into `keyword_corpus`. New keywords get first_seen_at = today.
 *
 * Schedule in vercel.json: "0 18 * * *" (UTC) = KST 새벽 3시
 *
 * Can also be called manually:
 *   GET /api/cron/collect-keywords?manual=true
 *   Authorization: Bearer ${CRON_SECRET}
 */
export const maxDuration = 60; // Vercel Pro: 60s max

/** Timing-safe string comparison to prevent timing attacks on secrets */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return _tse(Buffer.from(a), Buffer.from(b));
}

export async function GET(request: Request) {
  // Auth: Vercel CRON_SECRET or manual trigger
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization") ?? "";
  if (!cronSecret || !safeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    // 1. Ensure keyword_corpus table exists
    await ensureTable();

    // 2. Collect seed keywords from all sources
    const seeds = await collectSeeds();
    console.log(`[collect-keywords] Collected ${seeds.length} unique seeds`);

    // 3. Fetch related keywords from SearchAd API in parallel batches
    const allRelated = await fetchAllRelated(seeds);
    console.log(`[collect-keywords] Fetched ${allRelated.length} related keywords`);

    // 4. Upsert into keyword_corpus
    const { inserted, updated } = await upsertCorpus(allRelated);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const result = {
      seeds: seeds.length,
      collected: allRelated.length,
      newToday: inserted,
      updated,
      elapsed: `${elapsed}s`,
    };

    console.log(`[collect-keywords] Done:`, result);
    return Response.json(result);
  } catch (err) {
    console.error("[collect-keywords] Fatal error:", err instanceof Error ? err.message : err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface CollectedKeyword {
  keyword: string;
  sourceSeed: string;
  pcVolume: number;
  mobileVolume: number;
  competition: string;
}

async function ensureTable() {
  const supabase = await createServerClient();

  // Try a simple select — if table doesn't exist, create it
  const { error } = await supabase
    .from("keyword_corpus")
    .select("id")
    .limit(1);

  if (error?.code === "42P01" || error?.message?.includes("does not exist")) {
    // Table doesn't exist — create it via raw SQL
    // Note: service_role can execute DDL via postgrest if pg_net is enabled,
    // but for safety, we use the REST API for schema detection only.
    // The table should be created via the migration SQL first.
    console.warn(
      "[collect-keywords] keyword_corpus table not found. " +
      "Please run supabase/migration-002-keyword-corpus.sql in your Supabase SQL Editor."
    );
    throw new Error(
      "keyword_corpus table does not exist. Run migration-002 first."
    );
  }
}

async function collectSeeds(): Promise<string[]> {
  const seedSet = new Set<string>();

  // Source 1: Trending category seeds
  for (const kw of getAllTrendingSeeds()) {
    seedSet.add(kw);
  }

  // Source 2: Current month seasonal seeds
  const currentMonth = new Date().getMonth() + 1;
  for (const kw of getSeasonalSeeds(currentMonth)) {
    seedSet.add(kw);
  }

  // Source 3: Recent user searches from DB
  try {
    const supabase = await createServerClient();
    const { data } = await supabase
      .from("keyword_searches")
      .select("keyword")
      .order("created_at", { ascending: false })
      .limit(100);

    if (data) {
      for (const row of data) {
        seedSet.add(row.keyword);
      }
    }
  } catch {
    console.warn("[collect-keywords] Failed to fetch user keywords, continuing with static seeds");
  }

  return [...seedSet];
}

async function fetchAllRelated(seeds: string[]): Promise<CollectedKeyword[]> {
  const resultMap = new Map<string, CollectedKeyword>();
  const BATCH_SIZE = 5; // parallel requests per batch
  const DELAY_MS = 200; // delay between batches to respect rate limits

  for (let i = 0; i < seeds.length; i += BATCH_SIZE) {
    const batch = seeds.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (seed) => {
        try {
          const related = await getRelatedKeywords(seed);
          return related.map((stat) => ({
            keyword: stat.relKeyword,
            sourceSeed: seed,
            pcVolume: stat.monthlyPcQcCnt,
            mobileVolume: stat.monthlyMobileQcCnt,
            competition: stat.compIdx,
          }));
        } catch (err) {
          console.warn(`[collect-keywords] Failed for seed "${seed}":`, err instanceof Error ? err.message : err);
          return [] as CollectedKeyword[];
        }
      })
    );

    for (const keywords of results) {
      for (const kw of keywords) {
        // Keep highest volume version if duplicate
        const existing = resultMap.get(kw.keyword);
        if (!existing || (kw.pcVolume + kw.mobileVolume) > (existing.pcVolume + existing.mobileVolume)) {
          resultMap.set(kw.keyword, kw);
        }
      }
    }

    // Rate limit delay between batches
    if (i + BATCH_SIZE < seeds.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  return [...resultMap.values()];
}

async function upsertCorpus(
  keywords: CollectedKeyword[]
): Promise<{ inserted: number; updated: number }> {
  const supabase = await createServerClient();
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  let inserted = 0;
  let updated = 0;

  // Filter out low-quality keywords (volume < 10)
  const filtered = keywords.filter(
    (kw) => (kw.pcVolume + kw.mobileVolume) >= 10
  );

  // Batch upsert: fetch existing first_seen_at, then upsert all in one call per chunk
  const CHUNK = 500;
  for (let i = 0; i < filtered.length; i += CHUNK) {
    const chunk = filtered.slice(i, i + CHUNK);
    const chunkKeywords = chunk.map((kw) => kw.keyword);

    // Fetch existing keywords with their first_seen_at to preserve it
    const { data: existing } = await supabase
      .from("keyword_corpus")
      .select("keyword, first_seen_at")
      .in("keyword", chunkKeywords);

    const existingMap = new Map(
      (existing ?? []).map((r) => [r.keyword, r.first_seen_at as string])
    );

    // Build upsert rows: new → first_seen_at=today, existing → keep original
    const rows = chunk.map((kw) => ({
      keyword: kw.keyword,
      source_seed: kw.sourceSeed,
      pc_volume: kw.pcVolume,
      mobile_volume: kw.mobileVolume,
      competition: kw.competition,
      first_seen_at: existingMap.get(kw.keyword) ?? today,
      last_seen_at: today,
    }));

    const newCount = chunk.filter((kw) => !existingMap.has(kw.keyword)).length;

    const { error } = await supabase
      .from("keyword_corpus")
      .upsert(rows, { onConflict: "keyword" });

    if (error) {
      console.error(`[collect-keywords] Upsert error:`, error.message);
    } else {
      inserted += newCount;
      updated += chunk.length - newCount;
    }
  }

  return { inserted, updated };
}
