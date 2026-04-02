/**
 * Simple in-memory cache with TTL (Time-To-Live) support.
 * Used to cache Naver API responses to reduce API calls and improve response time.
 *
 * Cache durations from APP_CONFIG:
 * - Keyword data: 24 hours
 * - Top posts: 6 hours
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

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
const globalForCache = globalThis as unknown as { __cache?: MemoryCache };
export const cache = globalForCache.__cache ??= new MemoryCache();

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
 * If the key exists and hasn't expired, return cached value.
 * Otherwise, call the fetcher, cache the result, and return it.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const existing = cache.get<T>(key);
  if (existing !== null) return existing;

  const result = await fetcher();
  cache.set(key, result, ttlMs);
  return result;
}
