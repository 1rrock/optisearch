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
const MAX_MEM_ENTRIES = 1000;

function pruneMemStore() {
  const now = Date.now();
  for (const [key, entry] of memStore) {
    if (now > entry.resetAt) memStore.delete(key);
  }
}

function checkMemory(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = memStore.get(userId);

  if (!entry || now > entry.resetAt) {
    // Evict expired entries if store is growing large
    if (memStore.size >= MAX_MEM_ENTRIES) pruneMemStore();
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

async function checkRedis(
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedis();
  if (!redis) return checkMemory(userId);

  const key = `rl:${userId}`;

  try {
    // Use simple INCR + conditional EXPIRE instead of eval/Lua for
    // maximum compatibility with Upstash Redis.
    const count = await redis.incr(key);

    // Set expiry only on first increment (new window)
    if (count === 1) {
      await redis.expire(key, WINDOW_SEC);
    }

    // Safety: if the key somehow lost its TTL, re-set it
    if (count > MAX_REQUESTS) {
      const ttl = await redis.ttl(key);
      if (ttl === -1) {
        // Key exists without expiry — force a reset
        await redis.expire(key, WINDOW_SEC);
      }
    }

    const remaining = Math.max(0, MAX_REQUESTS - count);
    return { allowed: count <= MAX_REQUESTS, remaining };
  } catch (err) {
    console.error("[rate-limit] Redis error, falling back to memory:", err);
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
