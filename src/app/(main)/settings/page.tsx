"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
import { PLAN_LIMITS, PLAN_PRICING, type PlanId } from "@/shared/config/constants";
import { CreditCard, ShieldAlert, Search, Flame, Zap, Star, LogOut, ArrowUpCircle, ArrowDownCircle, XCircle, AlertTriangle } from "lucide-react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";


type Section = "subscription" | "danger" | "logout";

interface SubscriptionInfo {
  plan: PlanId;
  status: string | null;
  currentPeriodEnd: string | null;
  nextBillingDate: string | null;
  isTrial: boolean;
  isTrialExpired: boolean;
  trialEndsAt: string | null;
  trialDaysLeft: number;
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
  const [activeSection, setActiveSection] = useState<Section>("subscription");
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);

  // 구독 액션 로딩 상태
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // 모달 상태
  const [cancelStep, setCancelStep] = useState<0 | 1 | 2>(0); // 0=closed, 1=step1, 2=step2

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
        nextBillingDate?: string;
        isTrial?: boolean;
        isTrialExpired?: boolean;
        trialEndsAt?: string | null;
        trialDaysLeft?: number;
      };
      setSubInfo({
        plan: (json.plan ?? "free") as PlanId,
        status: json.status ?? null,
        currentPeriodEnd: json.currentPeriodEnd ?? null,
        nextBillingDate: json.nextBillingDate ?? null,
        isTrial: json.isTrial ?? false,
        isTrialExpired: json.isTrialExpired ?? false,
        trialEndsAt: json.trialEndsAt ?? null,
        trialDaysLeft: json.trialDaysLeft ?? 0,
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

    void (async () => {
      const res = await fetch("/api/subscription");
      const data = await res.json() as { plan?: string; status?: string; hasPendingBilling?: boolean };
      void refreshDashboard();
      if (data.status === "active") {
        toast.success("구독이 활성화되었습니다.", { duration: 4000 });
      } else {
        toast.success("결제 확인이 진행 중입니다. 잠시 후 구독 상태를 다시 확인해 주세요.", { duration: 5000 });
      }
      void fetchSubInfo();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatAmount = (n: number) => n.toLocaleString("ko-KR") + "원";

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    try {
      const res = await fetch("/api/subscription/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro" }),
      });
      const data = await res.json() as { nextStep?: string; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "업그레이드 요청 실패");
        return;
      }
      if (data.nextStep) {
        window.location.href = data.nextStep;
      }
    } catch {
      toast.error("네트워크 오류");
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleDowngradeToBasic = async () => {
    setUpgradeLoading(true);
    try {
      const res = await fetch("/api/subscription/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "basic" }),
      });
      const data = await res.json() as { nextStep?: string; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "변경 요청 실패");
        return;
      }
      if (data.nextStep) {
        window.location.href = data.nextStep;
      }
    } catch {
      toast.error("네트워크 오류");
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleCancel = async () => {
    setCancelLoading(true);
    try {
      const res = await fetch("/api/subscription/cancel", { method: "POST" });
      const json = await res.json() as { ok?: boolean; cleared?: boolean; currentPeriodEnd?: string; error?: string };
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "구독 해지에 실패했습니다.");
        return;
      }
      if (isPendingBilling || json.cleared) {
        toast.success("진행 중인 결제가 취소되었습니다.");
      } else {
        const until = json.currentPeriodEnd ? ` ${formatDate(json.currentPeriodEnd)}까지 서비스를 이용하실 수 있습니다.` : "";
        toast.success(`구독이 해지되었습니다.${until}`);
      }
      setCancelStep(0);
      window.location.reload();
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
  const isPendingBilling = subInfo?.status === "pending_billing";
  const hasGracePeriodEntitlement =
    subInfo?.status === "pending_cancel" ||
    (subInfo?.status === "stopped" && !!subInfo.currentPeriodEnd && new Date(subInfo.currentPeriodEnd) > new Date());
  const wasRedirectedFromCheckout = searchParams.get("already") === "1";
  const hasPendingBillingRedirect = searchParams.get("pending") === "1";
  const cancelActionDescription = isPendingBilling
    ? "카드 등록 또는 결제 확인 진행을 중단합니다. 진행 중인 결제가 취소되며, 구독은 활성화되지 않습니다."
    : subInfo?.currentPeriodEnd
    ? `${formatDate(subInfo.currentPeriodEnd)}까지 이용 가능하며, 다음 결제부터 자동 갱신이 중단됩니다.`
    : "현재 구독 기간 만료 후 자동갱신이 중단됩니다.";

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

                  {wasRedirectedFromCheckout && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
                      <AlertTriangle className="size-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                        이미 활성화된 구독이 있어 결제 페이지 대신 구독 관리로 이동했습니다. 여기서 업그레이드, 다운그레이드, 해지 상태를 확인할 수 있습니다.
                      </p>
                    </div>
                  )}

                  {hasPendingBillingRedirect && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
                      <AlertTriangle className="size-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                        결제 확인이 끝나지 않은 구독이 있어 결제 페이지 대신 구독 관리로 이동했습니다. 여기서 상태를 확인하거나 진행 중인 결제를 취소할 수 있습니다.
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

                  {isPendingBilling && (
                    <div className="flex flex-col gap-4 p-4 rounded-xl bg-blue-50/50 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/50">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-foreground">카드 등록 / 결제 확인 진행 중</span>
                        <span className="text-xs text-muted-foreground leading-relaxed">
                          카드 등록 또는 첫 결제 확인이 아직 마무리되지 않았습니다.
                          {subInfo?.nextBillingDate
                            ? ` 다음 결제 예정일은 ${formatDate(subInfo.nextBillingDate)}입니다.`
                            : " 결제 확인이 끝나면 구독 상태가 자동으로 반영됩니다."}
                          진행을 멈추려면 아래에서 결제 진행 취소를 할 수 있습니다.
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button asChild variant="outline" className="rounded-xl font-bold w-full sm:w-auto">
                          <Link href="/settings/billing">결제 내역 보기</Link>
                        </Button>
                        <Button
                          variant="destructive"
                          className="rounded-xl font-bold w-full sm:w-auto"
                          onClick={() => setCancelStep(1)}
                          disabled={cancelLoading}
                        >
                          진행 중인 결제 취소
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* 체험 만료 배너 */}
                  {subInfo?.isTrialExpired && !subInfo.isTrial && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-foreground">
                          14일 무료 체험이 종료되었습니다
                        </span>
                        <span className="text-xs text-muted-foreground">
                          체험 기간 동안 이용하셨던 프로 기능을 계속 사용하려면 구독을 시작하세요. 지금 바로 끊김 없이 이어갈 수 있습니다.
                        </span>
                      </div>
                      <Button asChild className="rounded-xl font-bold shrink-0 w-full sm:w-auto bg-primary hover:bg-primary/90">
                        <a href="/pricing">구독 시작하기</a>
                      </Button>
                    </div>
                  )}

                  {/* 가입 체험 배너 */}
                  {subInfo?.isTrial && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-primary/10 border border-primary/30">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-foreground">
                          무료 체험 {subInfo.trialDaysLeft}일 남음
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(subInfo.trialEndsAt)}까지 프로 플랜의 모든 기능을 이용할 수 있어요. 종료 전 결제하면 끊김 없이 사용 가능합니다.
                        </span>
                      </div>
                      <Button asChild className="rounded-xl font-bold shrink-0 w-full sm:w-auto">
                        <a href="/pricing">결제하고 계속 사용</a>
                      </Button>
                    </div>
                  )}

                  {/* Plan badge */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-muted">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">현재 플랜</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-foreground">{pricing.label}</span>
                        {subInfo?.isTrial && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                            체험
                          </span>
                        )}
                        {plan !== "free" && !subInfo?.isTrial && !isStopped && !isPendingCancel && !isPendingBilling && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            활성
                          </span>
                        )}
                        {isPendingBilling && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                            결제 확인 중
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
                  {plan !== "free" && (subInfo?.currentPeriodEnd || subInfo?.nextBillingDate) && (
                    <div className="flex items-center justify-between text-sm px-1">
                      <span className="text-muted-foreground font-medium">
                        {isStopped || isPendingCancel ? "이용 만료일" : isPendingBilling ? "결제 예정일" : "다음 결제일"}
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatDate(subInfo.currentPeriodEnd ?? subInfo.nextBillingDate ?? null)}
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

                    {plan !== "free" && !isPendingBilling && (
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-foreground">결제 내역</span>
                          <span className="text-xs text-muted-foreground">영수증, 결제 내역, 환불 가능 여부를 확인합니다.</span>
                        </div>
                        <Button asChild variant="outline" className="rounded-xl font-bold shrink-0 ml-4">
                          <Link href="/settings/billing">결제 내역 보기</Link>
                        </Button>
                      </div>
                    )}

                    {plan !== "free" && hasGracePeriodEntitlement && subInfo?.currentPeriodEnd && (
                      <div className="flex flex-col gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-foreground">
                            {isPendingCancel ? "현재 권한을 유지한 채 다음 결제를 정할 수 있어요" : "남은 이용 기간 안에 다음 결제를 정할 수 있어요"}
                          </span>
                          <span className="text-xs text-muted-foreground leading-relaxed">
                            현재 {pricing.label} 이용 권한은 {formatDate(subInfo.currentPeriodEnd)}까지 유지됩니다.
                            같은 플랜을 계속 쓰면 {formatDate(subInfo.currentPeriodEnd)}부터 {pricing.label} 월 {pricing.monthly.toLocaleString()}원 정기결제가 다시 시작됩니다.
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button asChild variant="outline" className="rounded-xl font-bold w-full sm:w-auto">
                            <a href={`/checkout?plan=${subInfo.plan}`}>
                              {isPendingCancel ? "같은 플랜 계속 사용" : "같은 플랜 재구독"}
                            </a>
                          </Button>
                          {plan === "basic" && (
                            <Button asChild className="rounded-xl font-bold w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
                              <a href="/checkout?plan=pro">프로로 바로 업그레이드</a>
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* basic 플랜: pro 업그레이드 */}
                    {plan === "basic" && isActive && !isPendingCancel && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-blue-50/50 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/50">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold text-foreground">프로 플랜으로 업그레이드</span>
                          <span className="text-xs text-muted-foreground">무제한 검색, AI 분석 100회/일, 초안 생성 30회/일</span>
                        </div>
                        <Button
                          className="rounded-xl font-bold shrink-0 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={handleUpgrade}
                          disabled={upgradeLoading}
                        >
                          <ArrowUpCircle className="size-4 mr-1.5" />
                          {upgradeLoading ? "처리 중..." : "프로로 업그레이드"}
                        </Button>
                      </div>
                    )}

                    {/* pro 플랜: basic 다운그레이드 */}
                    {plan === "pro" && isActive && !isPendingCancel && (
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-foreground">플랜 변경</span>
                          <span className="text-xs text-muted-foreground">베이직 플랜({PLAN_PRICING.basic.monthly.toLocaleString()}원/월)으로 변경합니다.</span>
                        </div>
                        <Button
                          variant="outline"
                          className="rounded-xl font-bold shrink-0 ml-4"
                          onClick={handleDowngradeToBasic}
                          disabled={upgradeLoading}
                        >
                          <ArrowDownCircle className="size-4 mr-1.5" />
                          베이직으로 변경
                        </Button>
                      </div>
                    )}

                    {/* active 구독이면 해지 버튼 */}
                    {plan !== "free" && isActive && !isStopped && !isPendingCancel && (
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
                          구독이 해지되었습니다. {formatDate(subInfo.currentPeriodEnd)}까지 서비스를 이용하실 수 있습니다.
                        </p>
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

      {/* 구독 해지 1단계 모달 */}
      <AlertDialog open={cancelStep === 1} onOpenChange={(open) => { if (!open) setCancelStep(0); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isPendingBilling ? "진행 중인 결제를 취소할까요?" : "구독을 해지하시겠어요?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelActionDescription}
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
              {isPendingBilling ? "결제 진행 취소" : "해지"}
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
              {isPendingBilling
                ? "진행 중인 카드 등록 또는 결제 확인을 취소합니다. 이 작업은 되돌릴 수 없습니다."
                : "구독 해지를 최종 확인합니다. 이 작업은 되돌릴 수 없습니다. 해지 후에는 현재 결제 기간이 종료되면 무료 플랜으로 전환됩니다."}
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
              {cancelLoading ? "처리 중..." : isPendingBilling ? "결제 진행 취소 확인" : "해지 확인"}
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
