export type QuotaTier = "FREE" | "PRO" | "ENTERPRISE";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const UNLIMITED = -1;
const MAX_MEM_ENTRIES = 2000;

const TIER_LIMITS: Record<QuotaTier, number> = {
  FREE: 10,
  PRO: 100,
  ENTERPRISE: UNLIMITED,
};

interface QuotaEntry {
  day: string;
  used: number;
}

const usageStore = new Map<string, QuotaEntry>();

function getCurrentKstDay(nowMs: number): string {
  return new Date(nowMs + KST_OFFSET_MS).toISOString().split("T")[0];
}

function getNextResetAtIso(nowMs: number): string {
  const nowKst = new Date(nowMs + KST_OFFSET_MS);
  const nextKstMidnightUtcMs = Date.UTC(
    nowKst.getUTCFullYear(),
    nowKst.getUTCMonth(),
    nowKst.getUTCDate() + 1,
    0,
    0,
    0,
    0
  ) - KST_OFFSET_MS;

  return new Date(nextKstMidnightUtcMs).toISOString();
}

function pruneExpiredEntries(activeDay: string): void {
  for (const [key, entry] of usageStore) {
    if (entry.day !== activeDay) {
      usageStore.delete(key);
    }
  }
}

export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  used: number;
  limit: number;
  resetAt: string;
  tier: QuotaTier;
}

export async function checkQuota(userId: string, tier: QuotaTier = "FREE"): Promise<QuotaCheckResult> {
  const nowMs = Date.now();
  const day = getCurrentKstDay(nowMs);
  const limit = TIER_LIMITS[tier] ?? TIER_LIMITS.FREE;
  const resetAt = getNextResetAtIso(nowMs);

  if (usageStore.size >= MAX_MEM_ENTRIES) {
    pruneExpiredEntries(day);
  }

  const existing = usageStore.get(userId);
  const entry: QuotaEntry = !existing || existing.day !== day
    ? { day, used: 0 }
    : existing;

  if (limit === UNLIMITED) {
    entry.used += 1;
    usageStore.set(userId, entry);
    return {
      allowed: true,
      remaining: UNLIMITED,
      used: entry.used,
      limit: UNLIMITED,
      resetAt,
      tier,
    };
  }

  if (entry.used >= limit) {
    usageStore.set(userId, entry);
    return {
      allowed: false,
      remaining: 0,
      used: entry.used,
      limit,
      resetAt,
      tier,
    };
  }

  entry.used += 1;
  usageStore.set(userId, entry);

  return {
    allowed: true,
    remaining: Math.max(0, limit - entry.used),
    used: entry.used,
    limit,
    resetAt,
    tier,
  };
}

export function resetQuota(userId: string): void {
  usageStore.delete(userId);
}
