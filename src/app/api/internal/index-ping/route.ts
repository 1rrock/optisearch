import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * Index ping endpoint — pings Google's sitemap submission URL.
 *
 * Auth: X-Cron-Secret header OR ?secret= query param matched against CRON_SECRET.
 * Vercel cron calls this daily at UTC 23:00 (KST 08:00).
 *
 * Ping failures are non-fatal: the route always returns 200 with a status field.
 */
export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[index-ping] CRON_SECRET not configured");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const headerSecret = request.headers.get("x-cron-secret") ?? "";
  const querySecret = request.nextUrl.searchParams.get("secret") ?? "";
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";

  const authorized =
    isVercelCron ||
    (headerSecret !== "" && safeEqual(headerSecret, cronSecret)) ||
    (querySecret !== "" && safeEqual(querySecret, cronSecret));

  if (!authorized) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sitemapUrl = "https://www.optisearch.kr/sitemap.xml";
  const googlePingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;

  let google: "ok" | "failed" = "failed";
  try {
    const res = await fetch(googlePingUrl, { method: "GET" });
    if (res.ok) google = "ok";
    else console.warn("[index-ping] Google ping non-ok status:", res.status);
  } catch (err) {
    console.error("[index-ping] Google ping failed:", err);
  }

  const timestamp = new Date().toISOString();
  console.log(`[index-ping] google=${google} ts=${timestamp}`);

  return Response.json({ google, timestamp });
}
