// Lightweight Sentry integration via CDN / manual init
// Replace with @sentry/nextjs when package is installed

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

export function initSentry() {
  // Will be initialized when @sentry/nextjs is installed
  // For now, capture errors to console
  if (typeof window !== "undefined" && !SENTRY_DSN) {
    return;
  }
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  console.error("[Sentry]", error, context);
  // When @sentry/nextjs is installed, this will call Sentry.captureException
}

export function captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
  console.log(`[Sentry:${level}]`, message);
}
