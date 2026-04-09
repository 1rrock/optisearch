import { timingSafeEqual } from "node:crypto";

/**
 * Timing-safe string comparison to prevent timing attacks on secrets.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Verify cron request authorization.
 * Returns null if authorized, or a Response if not.
 */
export function verifyCronAuth(request: Request): Response | null {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization") ?? "";

  if (!cronSecret) {
    console.error("[cron-auth] CRON_SECRET not configured");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!safeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
