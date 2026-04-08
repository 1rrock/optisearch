import { timingSafeEqual as _tse } from "node:crypto";
import { createServerClient } from "@/shared/lib/supabase";
import { searchShopping } from "@/shared/lib/naver-search";
import { toKstMidnight } from "@/shared/lib/date-utils";

/**
 * Vercel Cron job — runs daily to collect shopping rank for all active targets.
 *
 * For each active rank_track_target, searches Naver Shopping API with the
 * keyword and finds the first occurrence of the target's store_id in mallName.
 * Rank = index + 1 (1-100), or 0 if not found within top 100.
 *
 * Schedule in vercel.json: "0 19 * * *" (UTC) = KST 새벽 4시
 * Runs 1 hour after collect-keywords (UTC 18:00).
 */
export const maxDuration = 60;

const BATCH_SIZE = 5;
const DELAY_MS = 200;
const TIMEOUT_THRESHOLD_MS = 50_000; // graceful stop at 50s

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return _tse(Buffer.from(a), Buffer.from(b));
}

interface ActiveTarget {
  id: string;
  keyword: string;
  store_id: string;
  source: string;
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization") ?? "";
  if (!cronSecret || !safeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    const supabase = await createServerClient();

    // 1. Fetch all active targets
    const { data: targets, error: targetsError } = await supabase
      .from("rank_track_targets")
      .select("id, keyword, store_id, source")
      .eq("is_active", true)
      .eq("source", "naver");

    if (targetsError) {
      console.error("[collect-ranks] Failed to fetch targets:", targetsError.message);
      return Response.json({ error: "Failed to fetch targets" }, { status: 500 });
    }

    if (!targets || targets.length === 0) {
      return Response.json({ targets: 0, searched: 0, snapshots: 0, errors: 0, skipped: 0, elapsed: Date.now() - startTime });
    }

    console.log(`[collect-ranks] Found ${targets.length} active targets`);

    // 2. Deduplicate by keyword (multiple targets may share same keyword)
    const keywordMap = new Map<string, ActiveTarget[]>();
    for (const t of targets as ActiveTarget[]) {
      const key = t.keyword.trim().toLowerCase();
      if (!keywordMap.has(key)) keywordMap.set(key, []);
      keywordMap.get(key)!.push(t);
    }

    const uniqueKeywords = Array.from(keywordMap.keys());
    console.log(`[collect-ranks] ${uniqueKeywords.length} unique keywords to search`);

    // 3. Batch search Naver Shopping API
    const checkedAt = toKstMidnight();
    let searched = 0;
    let snapshots = 0;
    let errors = 0;
    let skipped = 0;

    for (let i = 0; i < uniqueKeywords.length; i += BATCH_SIZE) {
      // Graceful timeout check
      if (Date.now() - startTime > TIMEOUT_THRESHOLD_MS) {
        skipped = uniqueKeywords.length - i;
        console.warn(`[collect-ranks] Approaching timeout at ${Date.now() - startTime}ms, skipping ${skipped} remaining keywords`);
        break;
      }

      const batch = uniqueKeywords.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (keyword) => {
          const items = await searchShopping(keyword, 100).then((r) => r.items);
          return { keyword, items };
        })
      );

      for (const result of results) {
        if (result.status === "rejected") {
          errors++;
          console.error("[collect-ranks] Search failed:", result.reason);
          continue;
        }

        const { keyword, items } = result.value;
        searched++;

        // Find rank for each target with this keyword
        const targetsForKeyword = keywordMap.get(keyword) ?? [];
        for (const target of targetsForKeyword) {
          try {
            const normalizedStoreId = target.store_id.trim().toLowerCase();
            // Match by link URL containing the store slug (storeId from smartstore URL)
            // mallName is a display name, not the URL slug, so we match against link instead
            const rankIndex = items.findIndex(
              (item) => item.link.toLowerCase().includes(`smartstore.naver.com/${normalizedStoreId}`)
            );
            const rank = rankIndex >= 0 ? rankIndex + 1 : 0;

            const { error: upsertError } = await supabase
              .from("rank_snapshots")
              .upsert(
                {
                  target_id: target.id,
                  rank,
                  checked_at: checkedAt,
                },
                { onConflict: "target_id,checked_at" }
              );

            if (upsertError) {
              errors++;
              console.error(`[collect-ranks] Snapshot upsert failed for target ${target.id}:`, upsertError.message);
            } else {
              snapshots++;
            }
          } catch (err) {
            errors++;
            console.error(`[collect-ranks] Error processing target ${target.id}:`, err);
          }
        }
      }

      // Rate limit delay between batches
      if (i + BATCH_SIZE < uniqueKeywords.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[collect-ranks] Done: ${searched} searched, ${snapshots} snapshots, ${errors} errors, ${skipped} skipped, ${elapsed}ms`);

    return Response.json({ targets: targets.length, searched, snapshots, errors, skipped, elapsed });
  } catch (err) {
    console.error("[collect-ranks] Unexpected error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
