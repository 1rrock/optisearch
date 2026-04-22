"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDashboardData } from "@/shared/hooks/use-user";
import { useUserStore } from "@/shared/stores/user-store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
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
import { PLAN_LIMITS, PLAN_PRICING, UPGRADE_DIFF, type PlanId } from "@/shared/config/constants";
import { CreditCard, ShieldAlert, Search, Flame, Zap, Star, LogOut, ArrowUpCircle, ArrowDownCircle, XCircle, AlertTriangle } from "lucide-react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";


type Section = "subscription" | "danger" | "logout";

interface SubscriptionInfo {
  plan: PlanId;
  status: string | null;
  currentPeriodEnd: string | null;
  pendingAction: string | null;
  pendingPlan: string | null;
  pendingStartDate: string | null;
  failedChargeCount?: number;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function UsageBar({ label, used, limit, icon }: { label: string; used: number; limit: number; icon: React.ReactNode }) {
  const isUnlimited = limit === -1;
  const isUnsupported = limit === 0;
  const pct = isUnlimited || isUnsupported ? 0 : Math.min((used / limit) * 100, 100);
  const limitLabel = isUnlimited ? "무제한" : isUnsupported ? "미지원" : String(limit);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 font-semibold">
          <span className="text-muted-foreground">{icon}</span>
          {label}
        </div>
        <span className="text-muted-foreground text-xs font-medium">
          {isUnsupported ? "미지원" : `${used} / ${limitLabel}`}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        {!isUnlimited && !isUnsupported && (
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        )}
        {isUnlimited && (
          <div className="h-full rounded-full bg-emerald-400 w-full opacity-40" />
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <Card className="rounded-2xl border-muted shadow-sm animate-pulse">
      <CardHeader className="pb-4 border-b">
        <div className="h-5 w-32 bg-muted rounded" />
        <div className="h-4 w-64 bg-muted rounded mt-1" />
      </CardHeader>
      <CardContent className="flex flex-col gap-6 pt-6">
        <div className="h-10 w-full max-w-sm bg-muted rounded-xl" />
        <div className="h-10 w-full max-w-sm bg-muted rounded-xl" />
        <div className="h-10 w-28 bg-muted rounded-xl" />
      </CardContent>
    </Card>
  );
}

function SettingsPageContent() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Section>("subscription");
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);

  // 구독 액션 로딩 상태
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [downgradeLoading, setDowngradeLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // 모달 상태
  const [downgradeOpen, setDowngradeOpen] = useState(false);
  const [cancelStep, setCancelStep] = useState<0 | 1 | 2>(0); // 0=closed, 1=step1, 2=step2
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradePreview, setUpgradePreview] = useState<{ amount: number; nextBillingDate: string | null } | null>(null);

  const dashboardStore = useDashboardData();
  const refreshDashboard = useUserStore((s) => s.refresh);
  const data = dashboardStore.initialized ? { plan: dashboardStore.plan, usage: dashboardStore.usage } : null;
  const isLoading = !dashboardStore.initialized || dashboardStore.loading;

  const plan = (data?.plan ?? "free") as PlanId;
  const limits = PLAN_LIMITS[plan];
  const pricing = PLAN_PRICING[plan];

  const fetchSubInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/subscription");
      if (!res.ok) return;
      const json = await res.json() as {
        plan?: string;
        status?: string;
        currentPeriodEnd?: string;
        pendingAction?: string;
        pendingPlan?: string;
        pendingStartDate?: string;
        failedChargeCount?: number;
      };
      setSubInfo({
        plan: (json.plan ?? "free") as PlanId,
        status: json.status ?? null,
        currentPeriodEnd: json.currentPeriodEnd ?? null,
        pendingAction: json.pendingAction ?? null,
        pendingPlan: json.pendingPlan ?? null,
        pendingStartDate: json.pendingStartDate ?? null,
        failedChargeCount: json.failedChargeCount ?? 0,
      });
    } catch {
      // 조회 실패 시 무시 (기본값으로 폴백)
    }
  }, []);

  const searchParams = useSearchParams();

  useEffect(() => {
    void fetchSubInfo();
  }, [fetchSubInfo]);

  // 결제 완료 후 PayApp returnurl 리다이렉트 처리
  useEffect(() => {
    if (searchParams.get("from") !== "payment") return;

    // URL에서 from, billing 파라미터 제거 (뒤로가기 시 재표시 방지)
    const url = new URL(window.location.href);
    url.searchParams.delete("from");
    url.searchParams.delete("billing");
    window.history.replaceState({}, "", url.toString());

    // sessionStorage에서 결제 정보 읽기
    let pending: { plan: string; rebillNo: string | null; isBillKey?: boolean } | null = null;
    try {
      const raw = sessionStorage.getItem("payapp_pending");
      if (raw) pending = JSON.parse(raw) as { plan: string; rebillNo: string | null; isBillKey?: boolean };
    } catch {
      // ignore
    }

    // billkey 흐름: 카드 등록 후 첫 결제/구독 상태는 webhook이 authoritative하게 반영
    if (pending?.isBillKey) {
      try { sessionStorage.removeItem("payapp_pending"); } catch { /* ignore */ }
      void fetchSubInfo().then(() => {
        void refreshDashboard();
        toast.success("카드 등록 후 결제 확인이 진행 중입니다. 구독 상태가 자동으로 반영됩니다.", { duration: 6000 });
      });
      return;
    }

    if (!pending) {
      // sessionStorage 없으면 (다른 브라우저/탭 등) fetchSubInfo만 재조회
      void fetchSubInfo().then(() => {
        void refreshDashboard();
        toast.success("결제 확인이 진행 중입니다. 잠시 후 구독 상태를 다시 확인해 주세요.", { duration: 5000 });
      });
      return;
    }

    const { rebillNo } = pending;

    // return-url만으로는 더 이상 유료 권한을 활성화하지 않음
    if (!rebillNo) {
      try { sessionStorage.removeItem("payapp_pending"); } catch { /* ignore */ }
      void fetchSubInfo().then(() => void refreshDashboard());
      return;
    }

    try { sessionStorage.removeItem("payapp_pending"); } catch { /* ignore */ }
    void fetchSubInfo().then(() => {
      void refreshDashboard();
      toast.success("결제 상태는 PayApp 웹훅 확인 후 자동 반영됩니다.", { duration: 5000 });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatAmount = (n: number) => n.toLocaleString("ko-KR") + "원";

  const handleUpgradeClick = async () => {
    setUpgradeLoading(true);
    try {
      const res = await fetch("/api/subscription/upgrade", { method: "GET" });
      const data = await res.json() as { previewAmount?: number; nextBillingDate?: string | null; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "금액 조회 실패");
        return;
      }
      setUpgradePreview({ amount: data.previewAmount ?? 0, nextBillingDate: data.nextBillingDate ?? null });
      setUpgradeOpen(true);
    } catch {
      toast.error("네트워크 오류");
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    try {
      const res = await fetch("/api/subscription/upgrade", { method: "POST" });
      const data = await res.json() as { ok?: boolean; method?: string; mulNo?: string; checkoutUrl?: string; proRatedAmount?: number; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "업그레이드 요청 실패");
        return;
      }
      setUpgradeOpen(false);
      if (data.method === "free_upgrade") {
        toast.success("오늘이 결제일로 무료 업그레이드 완료! 곧 Pro 혜택이 적용됩니다.");
        setTimeout(() => router.refresh(), 2000);
      } else if (data.method === "billpay_instant") {
        const amount = data.proRatedAmount ?? upgradePreview?.amount ?? 0;
        toast.success(`Pro 업그레이드 차액 ${formatAmount(amount)} 결제 요청이 접수되었습니다. 결제 확인 후 자동 반영됩니다.`);
        setTimeout(() => router.refresh(), 2000);
      } else {
        toast.error("알 수 없는 응답 형식");
      }
    } catch {
      toast.error("네트워크 오류");
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleDowngrade = async () => {
    setDowngradeLoading(true);
    try {
      const res = await fetch("/api/subscription/downgrade", { method: "POST" });
      const json = await res.json() as { ok?: boolean; effectiveDate?: string; error?: string };
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "다운그레이드 요청에 실패했습니다.");
        return;
      }
      const dateLabel = json.effectiveDate ? formatDate(json.effectiveDate) : "다음 결제일";
      toast.success(`${dateLabel}부터 베이직 플랜이 적용됩니다.`);
      setDowngradeOpen(false);
      await fetchSubInfo();
    } catch {
      toast.error("다운그레이드 요청 중 오류가 발생했습니다.");
    } finally {
      setDowngradeLoading(false);
    }
  };

  const handleCancel = async () => {
    setCancelLoading(true);
    try {
      const res = await fetch("/api/subscription/cancel", { method: "POST" });
      const json = await res.json() as { ok?: boolean; usableUntil?: string; manualReview?: boolean; refundAmount?: number; pendingRefundAmount?: number; error?: string };
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "구독 해지에 실패했습니다.");
        return;
      }
      if (json.manualReview) {
        const refundLabel = json.refundAmount && json.refundAmount > 0
          ? ` 비례환불 ${formatAmount(json.refundAmount)}이 처리되었고`
          : "";
        toast.success(`해지 요청이 접수되었습니다.${refundLabel} 나머지 정리 항목은 수동 확인 후 마무리됩니다.`);
      } else {
        const refundLabel = json.refundAmount && json.refundAmount > 0
          ? ` 비례환불 ${formatAmount(json.refundAmount)}이 함께 처리되었습니다.`
          : "";
        toast.success(`구독이 해지되어 다음 결제부터 자동 갱신이 중단됩니다.${refundLabel}`);
      }
      setCancelStep(0);
      await fetchSubInfo();
    } catch {
      toast.error("구독 해지 중 오류가 발생했습니다.");
    } finally {
      setCancelLoading(false);
    }
  };

  const isActive =
    subInfo?.status === "active" ||
    subInfo?.status === "pending_cancel" ||
    (subInfo !== null && plan !== "free" && subInfo?.status == null);
  const isStopped = subInfo?.status === "stopped";
  const isPendingCancel = subInfo?.status === "pending_cancel";

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 text-foreground">설정</h2>
        <p className="text-muted-foreground">계정 정보, 구독 플랜 및 위험 구역을 관리합니다.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Settings Menu */}
        <div className="w-full md:w-64 flex flex-col gap-1 sticky top-24">
          <SettingNav
            icon={<CreditCard />}
            label="구독 관리"
            active={activeSection === "subscription"}
            onClick={() => setActiveSection("subscription")}
          />
          <SettingNav
            icon={<ShieldAlert />}
            label="위험 구역"
            active={activeSection === "danger"}
            onClick={() => setActiveSection("danger")}
          />
          <SettingNav
            icon={<LogOut />}
            label="로그아웃"
            active={activeSection === "logout"}
            onClick={() => signOut({ callbackUrl: "/login" })}
          />
        </div>

        {/* Setting Content */}
        <div className="flex-1 flex flex-col gap-6 w-full max-w-full overflow-hidden">

          {/* Subscription Section */}
          {activeSection === "subscription" && (
            isLoading ? <SkeletonCard /> : (
              <Card className="rounded-2xl border-muted shadow-sm">
                <CardHeader className="pb-4 border-b">
                  <CardTitle className="text-lg">구독 관리</CardTitle>
                  <CardDescription>현재 플랜 및 일일 사용량을 확인합니다.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-6 pt-6">

                  {/* Pending action 알림 배너 */}
                  {subInfo?.pendingAction === "upgrade" && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
                      <AlertTriangle className="size-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                        업그레이드 예약됨: {formatDate(subInfo.pendingStartDate)}부터 프로 플랜이 적용됩니다.
                      </p>
                    </div>
                  )}
                  {subInfo?.pendingAction === "downgrade" && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                      <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                      <div className="flex-1 flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                          다운그레이드 예약됨: {formatDate(subInfo.pendingStartDate)}부터 베이직 플랜이 적용됩니다.
                        </p>
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/subscription/cancel-pending", { method: "POST" });
                              const data = await res.json();
                              if (!res.ok) {
                                toast.error(data.error ?? "예약 취소 실패");
                              } else {
                                toast.success("다운그레이드 예약이 취소되었습니다. Pro 플랜이 유지됩니다.");
                                router.refresh();
                              }
                            } catch {
                              toast.error("네트워크 오류");
                            }
                          }}
                          className="text-xs text-amber-700 dark:text-amber-300 underline hover:no-underline shrink-0"
                        >
                          예약 취소
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 결제 실패 경고 배너 */}
                  {(subInfo?.failedChargeCount ?? 0) === 1 && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                      <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                        이번 달 자동결제에 실패했습니다. 결제 수단을 확인해주세요.
                        <br />
                        <span className="font-normal">(2회 더 실패 시 구독이 자동으로 중단됩니다)</span>
                      </p>
                    </div>
                  )}
                  {(subInfo?.failedChargeCount ?? 0) >= 2 && !isStopped && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/30">
                      <AlertTriangle className="size-4 text-destructive mt-0.5 shrink-0" />
                      <p className="text-sm text-destructive font-medium">
                        결제 실패 2회 누적. 다음 결제 실패 시 구독이 즉시 중단됩니다.
                      </p>
                    </div>
                  )}

                  {isPendingCancel && subInfo?.currentPeriodEnd && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
                      <AlertTriangle className="size-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                        다음 결제부터 해지 예정입니다. {formatDate(subInfo.currentPeriodEnd)}까지 현재 플랜을 계속 사용할 수 있습니다.
                      </p>
                    </div>
                  )}

                  {/* Plan badge */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-muted">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">현재 플랜</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-foreground">{pricing.label}</span>
                        {plan !== "free" && !isStopped && !isPendingCancel && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            활성
                          </span>
                        )}
                        {isPendingCancel && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                            해지 예정
                          </span>
                        )}
                        {isStopped && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            해지됨
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground font-medium">
                        {pricing.monthly === 0 ? "무료" : `월 ${pricing.monthly.toLocaleString()}원`}
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Star className="size-6" />
                    </div>
                  </div>

                  {/* 다음 결제일 */}
                  {plan !== "free" && subInfo?.currentPeriodEnd && (
                    <div className="flex items-center justify-between text-sm px-1">
                      <span className="text-muted-foreground font-medium">
                        {isStopped || isPendingCancel ? "이용 만료일" : "다음 결제일"}
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatDate(subInfo.currentPeriodEnd)}
                      </span>
                    </div>
                  )}

                  {/* Usage bars */}
                  <div className="flex flex-col gap-4">
                    <span className="text-sm font-bold text-foreground">오늘의 사용 현황</span>
                    <UsageBar
                      label="키워드 검색"
                      used={data?.usage.search ?? 0}
                      limit={limits.dailySearch}
                      icon={<Search className="size-4" />}
                    />
                    <UsageBar
                      label="AI 경쟁 분석"
                      used={data?.usage.analyze ?? 0}
                      limit={limits.dailyAnalyze}
                      icon={<Flame className="size-4" />}
                    />
                    <UsageBar
                      label="AI 초안 생성"
                      used={data?.usage.draft ?? 0}
                      limit={limits.dailyDraft}
                      icon={<Zap className="size-4" />}
                    />
                  </div>

                  {/* 플랜 액션 버튼 영역 */}
                  <div className="border-t border-muted pt-6 flex flex-col gap-3">

                    {/* free 플랜: 업그레이드 CTA */}
                    {plan === "free" && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold text-foreground">더 많은 기능이 필요하신가요?</span>
                          <span className="text-xs text-muted-foreground">베이직 플랜부터 일 300회 검색과 AI 기능을 사용하세요.</span>
                        </div>
                        <Button asChild className="rounded-xl font-bold shrink-0 w-full sm:w-auto">
                          <a href="/pricing">업그레이드</a>
                        </Button>
                      </div>
                    )}

                    {/* basic 플랜: pro 업그레이드 */}
                    {plan === "basic" && isActive && !isPendingCancel && !subInfo?.pendingAction && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-blue-50/50 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/50">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold text-foreground">프로 플랜으로 업그레이드</span>
                          <span className="text-xs text-muted-foreground">무제한 검색, AI 분석 100회/일, 초안 생성 30회/일</span>
                        </div>
                        <Button
                          className="rounded-xl font-bold shrink-0 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={handleUpgradeClick}
                          disabled={upgradeLoading}
                        >
                          <ArrowUpCircle className="size-4 mr-1.5" />
                          {upgradeLoading ? "금액 확인 중..." : `프로로 업그레이드 (+${UPGRADE_DIFF.basicToPro.toLocaleString()}원)`}
                        </Button>
                      </div>
                    )}

                    {/* pro 플랜: basic 다운그레이드 */}
                    {plan === "pro" && isActive && !isPendingCancel && !subInfo?.pendingAction && (
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-foreground">플랜 다운그레이드</span>
                          <span className="text-xs text-muted-foreground">다음 결제일부터 베이직 플랜({PLAN_PRICING.basic.monthly.toLocaleString()}원/월)이 적용됩니다.</span>
                        </div>
                        <Button
                          variant="outline"
                          className="rounded-xl font-bold shrink-0 ml-4"
                          onClick={() => setDowngradeOpen(true)}
                          disabled={downgradeLoading}
                        >
                          <ArrowDownCircle className="size-4 mr-1.5" />
                          베이직으로 변경
                        </Button>
                      </div>
                    )}

                    {/* pending_action이 있으면 해지 불가 안내 */}
                    {plan !== "free" && isActive && !isStopped && !isPendingCancel && subInfo?.pendingAction && (
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-muted">
                        <AlertTriangle className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground">
                          예약된 변경이 있어 해지할 수 없습니다.
                        </p>
                      </div>
                    )}

                    {/* active 구독이면 해지 버튼 */}
                    {plan !== "free" && isActive && !isStopped && !isPendingCancel && !subInfo?.pendingAction && (
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-foreground">구독 해지</span>
                          <span className="text-xs text-muted-foreground">
                            {subInfo?.currentPeriodEnd
                              ? `${formatDate(subInfo.currentPeriodEnd)}까지 이용 가능합니다.`
                              : "현재 구독 기간 만료 후 자동갱신이 중단됩니다."}
                          </span>
                        </div>
                        <Button
                          variant="destructive"
                          className="rounded-xl font-bold shrink-0 ml-4"
                          onClick={() => setCancelStep(1)}
                          disabled={cancelLoading}
                        >
                          <XCircle className="size-4 mr-1.5" />
                          구독 해지
                        </Button>
                      </div>
                    )}

                    {isPendingCancel && subInfo?.currentPeriodEnd && (
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-muted">
                        <AlertTriangle className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground">
                          해지가 접수되어 {formatDate(subInfo.currentPeriodEnd)} 이후 무료 플랜으로 전환됩니다.
                        </p>
                      </div>
                    )}

                    {/* 해지 완료 상태 안내 */}
                    {isStopped && subInfo?.currentPeriodEnd && (
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-muted">
                        <AlertTriangle className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground">
                          구독이 해지되었습니다{(subInfo.failedChargeCount ?? 0) >= 3 ? " (결제 실패로 인한 자동 중단)" : ""}. {formatDate(subInfo.currentPeriodEnd)}까지 서비스를 이용하실 수 있습니다.
                        </p>
                      </div>
                    )}

                    {/* 재구독 CTA — stopped 상태 유저 */}
                    {isStopped && subInfo?.currentPeriodEnd && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold text-foreground">구독을 재개하시겠어요?</span>
                          <span className="text-xs text-muted-foreground">
                            카드를 등록하면 {formatDate(subInfo.currentPeriodEnd)} 이후부터 자동 결제가 시작됩니다.
                          </span>
                        </div>
                        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                          <Button asChild variant="outline" size="sm" className="rounded-xl font-bold flex-1 sm:flex-initial">
                            <a href="/pricing">다른 플랜</a>
                          </Button>
                          <Button asChild size="sm" className="rounded-xl font-bold flex-1 sm:flex-initial">
                            <a href={`/checkout?plan=${subInfo.plan}`}>재구독</a>
                          </Button>
                        </div>
                      </div>
                    )}

                  </div>
                </CardContent>
              </Card>
            )
          )}

          {/* Danger Zone Section */}
          {activeSection === "danger" && (
            <Card className="rounded-2xl border-rose-100 shadow-sm bg-rose-50/30 overflow-hidden">
              <CardHeader className="pb-4 border-b border-rose-100/50">
                <CardTitle className="text-lg text-rose-600">위험 구역</CardTitle>
                <CardDescription className="text-rose-500/80">계정 삭제 및 데이터를 완전히 영구 삭제합니다.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6">
                <Button
                  variant="destructive"
                  className="rounded-xl font-bold bg-rose-500 hover:bg-rose-600 w-full sm:w-auto"
                  onClick={() => toast.info("회원 탈퇴 기능은 준비 중입니다.")}
                >
                  회원 탈퇴
                </Button>
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {/* Pro 업그레이드 금액 확인 모달 */}
      <AlertDialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pro로 업그레이드</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between py-2 border-b border-muted">
                  <span>지금 결제</span>
                  <span className="font-semibold text-foreground">
                    {upgradePreview?.amount === 0
                      ? "무료 (오늘이 결제일)"
                      : formatAmount(upgradePreview?.amount ?? 0) + " (남은 기간 비례)"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span>다음 결제</span>
                  <span className="font-semibold text-foreground">
                    {formatAmount(PLAN_PRICING.pro.monthly)}/월
                    {upgradePreview?.nextBillingDate
                      ? ` (${formatDate(upgradePreview.nextBillingDate)}부터)`
                      : ""}
                  </span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={upgradeLoading}>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={(e) => {
                e.preventDefault();
                void handleUpgrade();
              }}
              disabled={upgradeLoading}
            >
              {upgradeLoading ? "처리 중..." : "업그레이드 확인"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 다운그레이드 확인 모달 */}
      <AlertDialog open={downgradeOpen} onOpenChange={setDowngradeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>베이직으로 다운그레이드</AlertDialogTitle>
            <AlertDialogDescription>
              {subInfo?.currentPeriodEnd
                ? `다음 결제일(${formatDate(subInfo.currentPeriodEnd)})부터 베이직 플랜(월 ${PLAN_PRICING.basic.monthly.toLocaleString()}원)이 적용됩니다.`
                : `다음 결제일부터 베이직 플랜(월 ${PLAN_PRICING.basic.monthly.toLocaleString()}원)이 적용됩니다.`}
              <br />
              현재 구독 기간 중 환불은 제공되지 않습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={downgradeLoading}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDowngrade();
              }}
              disabled={downgradeLoading}
            >
              {downgradeLoading ? "처리 중..." : "다운그레이드"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 구독 해지 1단계 모달 */}
      <AlertDialog open={cancelStep === 1} onOpenChange={(open) => { if (!open) setCancelStep(0); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>구독을 해지하시겠어요?</AlertDialogTitle>
            <AlertDialogDescription>
              {subInfo?.currentPeriodEnd
                ? `이용기간 만료일(${formatDate(subInfo.currentPeriodEnd)})까지 서비스를 사용하실 수 있습니다.`
                : "현재 결제 기간이 끝날 때까지 서비스를 이용하실 수 있습니다."}
              <br />
              다음 주기부터 자동 결제가 중단됩니다. 정말 해지하시겠어요?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelStep(0)}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                setCancelStep(2);
              }}
            >
              해지
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 구독 해지 2단계 확인 모달 */}
      <AlertDialog open={cancelStep === 2} onOpenChange={(open) => { if (!open) setCancelStep(0); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">최종 확인</AlertDialogTitle>
            <AlertDialogDescription>
              구독 해지를 최종 확인합니다. 이 작업은 되돌릴 수 없습니다.
              <br />
              해지 후에는 현재 결제 기간이 종료되면 무료 플랜으로 전환됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelLoading} onClick={() => setCancelStep(0)}>돌아가기</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                void handleCancel();
              }}
              disabled={cancelLoading}
            >
              {cancelLoading ? "처리 중..." : "해지 확인"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsPageContent />
    </Suspense>
  );
}

function SettingNav({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium cursor-pointer transition-colors w-full text-left ${active
          ? "bg-primary/10 text-primary font-bold"
          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
        }`}
    >
      <div className="size-4 [&>svg]:size-full">{icon}</div>
      <span className="text-sm">{label}</span>
      {active && <div className="ml-auto w-1 h-4 bg-primary rounded-full" />}
    </button>
  );
}
