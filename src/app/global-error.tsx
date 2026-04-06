"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">오류가 발생했습니다</h1>
            <p className="text-muted-foreground">문제가 지속되면 <a href="http://pf.kakao.com/_CupuX" target="_blank" rel="noopener noreferrer" className="underline">카카오톡 채널</a>로 문의해주세요.</p>
            <button onClick={reset} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
