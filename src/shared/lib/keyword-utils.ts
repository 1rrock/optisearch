/**
 * Format a number with Korean locale (e.g., 1,234)
 */
export function formatNumber(n: number): string {
  return n.toLocaleString("ko-KR");
}

/**
 * Get Tailwind class for competition badge based on level
 */
export function competitionBadgeClass(competition: string): string {
  if (competition === "낮음") return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
  if (competition === "높음") return "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400";
  return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
}
