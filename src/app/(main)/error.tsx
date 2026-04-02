"use client";

import { useEffect } from "react";
import { Button } from "@/shared/ui/button";

export default function Error({
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
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <h2 className="text-xl font-bold">문제가 발생했습니다</h2>
      <p className="text-muted-foreground text-sm">일시적인 오류입니다. 다시 시도해 주세요.</p>
      <Button onClick={reset} variant="outline">다시 시도</Button>
    </div>
  );
}
