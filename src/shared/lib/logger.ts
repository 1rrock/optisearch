/**
 * Structured JSON logger for Vercel serverless.
 * Outputs JSON objects that Vercel Log Drains can parse.
 *
 * Usage:
 *   const log = createLogger("api/analyze");
 *   log.info("Analysis started", { keyword: "SEO" });
 *   log.error("Failed", { error: err.message, requestId: "abc123" });
 */

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  module: string;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function emit(entry: LogEntry) {
  const output = JSON.stringify(entry);
  switch (entry.level) {
    case "error":
      console.error(output);
      break;
    case "warn":
      console.warn(output);
      break;
    default:
      console.log(output);
  }
}

export function createLogger(module: string) {
  function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    emit({
      level,
      module,
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    });
  }

  return {
    info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
    warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
    error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
  };
}
