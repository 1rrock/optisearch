"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/button";

function BillingSuccessContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const authKey = params.get("authKey");
    const customerKey = params.get("customerKey");
    const plan = params.get("plan");

    if (!authKey || !customerKey) {
      setStatus("error");
      setErrorMessage("결제 정보가 올바르지 않습니다.");
      return;
    }

    fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authKey, customerKey, plan: plan ?? "basic" }),
    })
      .then((res) => res.json())
      .then((data: { error?: string; success?: boolean }) => {
        if (data.error) throw new Error(data.error);
        setStatus("success");
        setTimeout(() => router.push("/dashboard"), 2500);
      })
      .catch((err: unknown) => {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "결제 처리 중 오류가 발생했습니다.");
      });
  }, [params, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      {status === "loading" && (
        <>
          <Loader2 className="size-12 text-primary animate-spin" />
          <p className="text-lg font-semibold text-foreground">결제를 처리하고 있습니다...</p>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircle2 className="size-14 text-green-500" />
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-2xl font-bold text-foreground">구독이 완료되었습니다!</p>
            <p className="text-muted-foreground">잠시 후 대시보드로 이동합니다.</p>
          </div>
        </>
      )}

      {status === "error" && (
        <>
          <XCircle className="size-14 text-destructive" />
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-2xl font-bold text-foreground">결제에 실패했습니다.</p>
            <p className="text-muted-foreground text-sm max-w-md">{errorMessage}</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/pricing")}>
            요금제 페이지로 돌아가기
          </Button>
        </>
      )}
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <Loader2 className="size-12 text-primary animate-spin" />
          <p className="text-lg font-semibold text-foreground">결제를 처리하고 있습니다...</p>
        </div>
      }
    >
      <BillingSuccessContent />
    </Suspense>
  );
}
