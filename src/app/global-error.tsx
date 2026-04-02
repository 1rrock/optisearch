"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">오류가 발생했습니다</h1>
            <p className="text-muted-foreground">문제가 지속되면 support@optisearch.kr로 문의해주세요.</p>
            <button onClick={reset} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
