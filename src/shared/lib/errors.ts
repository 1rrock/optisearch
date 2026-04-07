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

type ApiErrorObject = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
};

export function getApiErrorMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;

  const record = data as Record<string, unknown>;
  const error = record.error;

  if (typeof error === "string") return error;

  if (error && typeof error === "object") {
    const errorObj = error as ApiErrorObject;
    if (typeof errorObj.message === "string") return errorObj.message;
  }

  return undefined;
}

/**
 * Parse a 429 USAGE_LIMIT_EXCEEDED API response into a UsageLimitError.
 * Returns null if the response is not a usage-limit error.
 */
export function parseUsageLimitError(
  status: number,
  data: Record<string, unknown>
): UsageLimitError | null {
  const errorObj = data.error && typeof data.error === "object"
    ? (data.error as Record<string, unknown>)
    : undefined;

  const code = typeof data.code === "string"
    ? data.code
    : typeof errorObj?.code === "string"
      ? errorObj.code
      : undefined;

  const message = getApiErrorMessage(data) ?? "일일 사용 한도를 초과했습니다.";

  if (status === 429 && code === "USAGE_LIMIT_EXCEEDED") {
    const match = /\((\d+)\/(\d+)\)/.exec(message);
    const used = match ? parseInt(match[1], 10) : 0;
    const limit = match ? parseInt(match[2], 10) : 0;
    return new UsageLimitError(message, used, limit);
  }
  return null;
}
