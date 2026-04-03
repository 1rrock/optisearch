/**
 * Per-user rate limiter with Redis persistence.
 *
 * Uses Upstash Redis (via Vercel KV) when available for accurate
 * cross-instance rate limiting on serverless. Falls back to in-memory
 * Map when Redis is not configured (local development).
 */

import { getRedis } from "./redis";

const WINDOW_SEC = 60; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute per user

// ---------------------------------------------------------------------------
// In-memory fallback (single-instance only)
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memStore = new Map<string, RateLimitEntry>();

function checkMemory(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = memStore.get(userId);

  if (!entry || now > entry.resetAt) {
    memStore.set(userId, { count: 1, resetAt: now + WINDOW_SEC * 1000 });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: MAX_REQUESTS - entry.count };
}

// ---------------------------------------------------------------------------
// Redis-backed (accurate across serverless instances)
// ---------------------------------------------------------------------------

// Lua script: atomic INCR + conditional EXPIRE (no race window)
const RATE_LIMIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return count
`;

async function checkRedis(
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedis();
  if (!redis) return checkMemory(userId);

  const key = `rl:${userId}`;

  try {
    const count = (await redis.eval(
      RATE_LIMIT_SCRIPT,
      [key],           // KEYS
      [WINDOW_SEC]     // ARGV
    )) as number;

    const remaining = Math.max(0, MAX_REQUESTS - count);
    return { allowed: count <= MAX_REQUESTS, remaining };
  } catch {
    // Redis failure — fall back to in-memory so the app keeps working
    return checkMemory(userId);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function checkRateLimit(
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  return checkRedis(userId);
}
