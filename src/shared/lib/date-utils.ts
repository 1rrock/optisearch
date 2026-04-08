/**
 * Returns KST (UTC+9) midnight as an ISO string for a given date.
 * Used for daily dedup in rank_snapshots (UNIQUE target_id + checked_at).
 *
 * Example: toKstMidnight(new Date("2026-04-08T19:00:00Z")) → "2026-04-09T00:00:00+09:00"
 */
export function toKstMidnight(date: Date = new Date()): string {
  const kst = new Date(date.getTime() + 9 * 3600 * 1000);
  const dateStr = kst.toISOString().split("T")[0];
  return `${dateStr}T00:00:00+09:00`;
}

/** Returns KST YYYY-MM-DD string for any Date or ISO timestamp string. */
export function getKSTDateString(input: Date | string = new Date()): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const kst = new Date(d.getTime() + 9 * 3600 * 1000);
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, "0")}-${String(kst.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Calculate change rate between recent and previous periods.
 * Used by trending cron and fallback API.
 */
export function calculateDailyChangeRate(
  data: Array<{ ratio: number }>,
): number | null {
  const recent = data.slice(-7);
  const previous = data.slice(-14, -7);
  if (recent.length === 0 || previous.length === 0) return null;

  const recentAvg = recent.reduce((s, d) => s + d.ratio, 0) / recent.length;
  const prevAvg = previous.reduce((s, d) => s + d.ratio, 0) / previous.length;
  if (prevAvg === 0) return recentAvg > 0 ? 100 : 0;
  return ((recentAvg - prevAvg) / prevAvg) * 100;
}
