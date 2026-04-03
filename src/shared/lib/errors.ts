/**
 * Shared error classes used across client components.
 */

export class UsageLimitError extends Error {
  used: number;
  limit: number;
  constructor(message: string, used: number, limit: number) {
    super(message);
    this.name = "UsageLimitError";
    this.used = used;
    this.limit = limit;
  }
}

/**
 * Parse a 429 USAGE_LIMIT_EXCEEDED API response into a UsageLimitError.
 * Returns null if the response is not a usage-limit error.
 */
export function parseUsageLimitError(
  status: number,
  data: Record<string, unknown>
): UsageLimitError | null {
  if (status === 429 && data.code === "USAGE_LIMIT_EXCEEDED") {
    const match = /\((\d+)\/(\d+)\)/.exec((data.error as string) ?? "");
    const used = match ? parseInt(match[1], 10) : 0;
    const limit = match ? parseInt(match[2], 10) : 0;
    return new UsageLimitError(
      (data.error as string) ?? "일일 사용 한도를 초과했습니다.",
      used,
      limit
    );
  }
  return null;
}
