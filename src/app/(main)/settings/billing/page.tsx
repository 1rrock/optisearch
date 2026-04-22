"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/shared/ui/alert-dialog";
import { ArrowLeft, Receipt, RefreshCw, ExternalLink, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { PaymentHistoryItem } from "@/app/api/billing/history/route";

const PURPOSE_LABELS: Record<string, string> = {
  subscription: "정기 구독",
  upgrade_diff: "프로 업그레이드 차액",
  downgrade_refund: "다운그레이드 환불",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function formatAmount(amount: number): string {
  return `${amount.toLocaleString()}원`;
}

function PurposeLabel({ purpose }: { purpose: string }) {
  return <span>{PURPOSE_LABELS[purpose] ?? purpose}</span>;
}

function StatusBadge({ refundedAt }: { refundedAt: string | null }) {
  if (refundedAt) {
    return (
      <Badge variant="secondary" className="text-xs font-semibold bg-rose-100 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800">
        환불됨
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-xs font-semibold bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
      결제완료
    </Badge>
  );
}

function RefundTooltip({ reason }: { reason: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs text-muted-foreground cursor-help"
      title={reason}
    >
      <AlertCircle className="size-3.5" />
      환불불가
    </span>
  );
}

function PaymentRow({
  item,
  onRefundRequest,
  refundingMulNo,
}: {
  item: PaymentHistoryItem;
  onRefundRequest: (item: PaymentHistoryItem) => void;
  refundingMulNo: string | null;
}) {
  const isRefunding = refundingMulNo === item.mulNo;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-muted last:border-0">
      {/* 날짜 + 항목 */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium shrink-0">
            {formatDate(item.paidAt)}
          </span>
          <StatusBadge refundedAt={item.refundedAt} />
        </div>
        <span className="text-sm font-semibold text-foreground truncate">
          <PurposeLabel purpose={item.purpose} />
        </span>
        <span className="text-xs text-muted-foreground">
          {formatAmount(item.amount)}
          {item.vat > 0 && (
            <span className="ml-1 opacity-70">(VAT {formatAmount(item.vat)} 포함)</span>
          )}
        </span>
      </div>

      {/* 액션 버튼 영역 */}
      <div className="flex items-center gap-2 shrink-0">
        {/* 영수증 */}
        {item.receiptUrl && (
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="rounded-lg text-xs text-muted-foreground hover:text-foreground h-8 px-2.5"
          >
            <a href={item.receiptUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5 mr-1" />
              영수증
            </a>
          </Button>
        )}

        {/* 환불 요청 */}
        {item.canRefund && !item.refundedAt ? (
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg text-xs h-8 px-3 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
            onClick={() => onRefundRequest(item)}
            disabled={isRefunding}
          >
            {isRefunding ? (
              <RefreshCw className="size-3.5 mr-1 animate-spin" />
            ) : null}
            {isRefunding ? "처리 중..." : "환불 요청"}
          </Button>
        ) : !item.refundedAt && item.refundBlockReason ? (
          <RefundTooltip reason={item.refundBlockReason} />
        ) : null}
      </div>
    </div>
  );
}

export default function BillingPage() {
  const [items, setItems] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<PaymentHistoryItem | null>(null);
  const [refundingMulNo, setRefundingMulNo] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/billing/history");
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error ?? "결제 내역 조회에 실패했습니다.");
      }
      const json = await res.json() as { items: PaymentHistoryItem[] };
      setItems(json.items ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "결제 내역 조회에 실패했습니다.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const handleRefundConfirm = async () => {
    if (!refundTarget) return;
    const { mulNo } = refundTarget;
    setRefundingMulNo(mulNo);
    setRefundTarget(null);

    try {
      const res = await fetch("/api/payments/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mulNo }),
      });
      const json = await res.json() as { ok?: boolean; refundedAmount?: number; error?: string; detail?: string };

      if (!res.ok || !json.ok) {
        const msg = json.error ?? "환불 요청에 실패했습니다.";
        toast.error(msg, { description: json.detail });
        return;
      }

      const amountLabel = json.refundedAmount ? formatAmount(json.refundedAmount) : "";
      toast.success(`환불이 완료되었습니다.${amountLabel ? ` (${amountLabel})` : ""}`);
      await fetchHistory();
    } catch {
      toast.error("환불 요청 중 오류가 발생했습니다.");
    } finally {
      setRefundingMulNo(null);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="rounded-xl text-muted-foreground hover:text-foreground -ml-2">
          <Link href="/settings">
            <ArrowLeft className="size-4 mr-1" />
            설정으로
          </Link>
        </Button>
      </div>

      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 text-foreground">결제 내역</h2>
        <p className="text-muted-foreground">최근 12개월 결제 내역 및 환불 요청을 관리합니다.</p>
      </div>

      <Card className="rounded-2xl border-muted shadow-sm">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="size-5" />
                결제 내역
              </CardTitle>
              <CardDescription className="mt-1">
                첫 정기구독 결제 후 7일 이내, 사용 이력이 없는 건에 한해 환불 요청이 가능합니다.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-muted-foreground hover:text-foreground"
              onClick={() => void fetchHistory()}
              disabled={loading}
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              <span className="sr-only">새로고침</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-2 pb-4">
          {loading && (
            <div className="flex flex-col gap-4 py-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex flex-col gap-2 py-4 border-b border-muted animate-pulse">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-4 w-14 bg-muted rounded-full" />
                  </div>
                  <div className="h-4 w-40 bg-muted rounded" />
                  <div className="h-3 w-24 bg-muted rounded" />
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <AlertCircle className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => void fetchHistory()}>
                다시 시도
              </Button>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Receipt className="size-8 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">최근 12개월 내 결제 내역이 없습니다.</p>
              <Button variant="outline" size="sm" asChild className="rounded-xl">
                <Link href="/pricing">플랜 보기</Link>
              </Button>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="flex flex-col">
              {items.map((item) => (
                <PaymentRow
                  key={item.id}
                  item={item}
                  onRefundRequest={setRefundTarget}
                  refundingMulNo={refundingMulNo}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 환불 확인 모달 */}
      <AlertDialog open={!!refundTarget} onOpenChange={(open) => { if (!open) setRefundTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>환불을 요청하시겠어요?</AlertDialogTitle>
            <AlertDialogDescription>
              {refundTarget && (
                <>
                  <span className="font-semibold text-foreground">
                    <PurposeLabel purpose={refundTarget.purpose} />
                  </span>{" "}
                  ({formatDate(refundTarget.paidAt)}, {formatAmount(refundTarget.amount)}) 결제 건을 환불 요청합니다.
                  <br />
                  환불 처리 후에는 구독이 중단되며, 결제수단 해제 확인이 추가로 필요할 수 있습니다. 계속하시겠어요?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                void handleRefundConfirm();
              }}
            >
              환불 요청
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
