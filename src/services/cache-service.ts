/**
 * Cache with TTL (Time-To-Live) support.
 * Uses Redis as a backing store when available, with in-memory as primary/fallback.
 *
 * Cache durations from APP_CONFIG:
 * - Keyword data: 24 hours
 * - Top posts: 6 hours
 */

import { getRedis } from "@/shared/lib/redis";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const MAX_CACHE_SIZE = 500;
const PRUNE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  /**
   * Get a cached value. Returns null if expired or not found.
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set a cached value with TTL in milliseconds.
   */
  set<T>(key: string, data: T, ttlMs: number): void {
    // Evict oldest entries if cache is full
    if (this.store.size >= MAX_CACHE_SIZE) {
      this.prune();
      // If still full after pruning expired, delete oldest entries
      if (this.store.size >= MAX_CACHE_SIZE) {
        const keysToDelete = [...this.store.keys()].slice(0, Math.floor(MAX_CACHE_SIZE / 4));
        for (const k of keysToDelete) this.store.delete(k);
      }
    }
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Delete a specific cache entry.
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all expired entries (housekeeping).
   */
  prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get the number of entries in the cache.
   */
  get size(): number {
    return this.store.size;
  }
}

// Singleton instance — lives for the duration of the server process.
// globalThis is used to survive Next.js hot-reload in development.
const globalForCache = globalThis as unknown as { __cache?: MemoryCache; __cachePruneTimer?: ReturnType<typeof setInterval> };
export const cache = globalForCache.__cache ??= new MemoryCache();

// Periodic prune to prevent memory leaks
if (!globalForCache.__cachePruneTimer) {
  globalForCache.__cachePruneTimer = setInterval(() => cache.prune(), PRUNE_INTERVAL_MS);
}

// ---------------------------------------------------------------------------
// Cache key builders
// ---------------------------------------------------------------------------

export const CacheKeys = {
  keywordAnalysis: (keyword: string) => `kw:${keyword.toLowerCase()}`,
  relatedKeywords: (keyword: string) => `rel:${keyword.toLowerCase()}`,
  topPosts: (keyword: string) => `top:${keyword.toLowerCase()}`,
  sectionAnalysis: (keyword: string) => `sec:${keyword.toLowerCase()}`,
} as const;

// ---------------------------------------------------------------------------
// Cache TTL constants (in milliseconds)
// ---------------------------------------------------------------------------

export const CacheTTL = {
  /** Keyword analysis data: 24 hours */
  KEYWORD: 24 * 60 * 60 * 1000,
  /** Top posts: 6 hours */
  TOP_POSTS: 6 * 60 * 60 * 1000,
  /** Related keywords: 24 hours */
  RELATED: 24 * 60 * 60 * 1000,
  /** Section analysis: 12 hours */
  SECTION: 12 * 60 * 60 * 1000,
} as const;

/**
 * Helper: get-or-set pattern for cache.
 * 1. Check in-memory cache first (fast path)
 * 2. If miss, check Redis
 * 3. If Redis hit, populate in-memory and return
 * 4. If both miss, call fetcher, store in both Redis and in-memory
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // 1. In-memory fast path
  const existing = cache.get<T>(key);
  if (existing !== null) return existing;

  // 2. Redis check
  const redis = getRedis();
  if (redis) {
    try {
      const redisVal = await redis.get<T>(key);
      if (redisVal !== null && redisVal !== undefined) {
        // Populate in-memory so subsequent calls skip Redis
        cache.set(key, redisVal, ttlMs);
        return redisVal;
      }
    } catch {
      // Redis failure — continue to fetcher
    }
  }

  // 3. Both miss — call fetcher
  const result = await fetcher();

  // 4. Store in both layers
  cache.set(key, result, ttlMs);
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(result), { ex: Math.ceil(ttlMs / 1000) });
    } catch {
      // Redis write failure is non-fatal
    }
  }

  return result;
}
