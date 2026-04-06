"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDashboardData } from "@/shared/hooks/use-user";
import { useUserStore } from "@/shared/stores/user-store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { PLAN_LIMITS, PLAN_PRICING, type PlanId } from "@/shared/config/constants";
import { CreditCard, ShieldAlert, Search, Flame, Zap, Star, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type Section = "subscription" | "danger";

interface SubscriptionData {
  plan: PlanId;
  subscriptionId: string | null;
  status: string | null;
  nextBillingDate: string | null;
  scheduledChange?: { action: string; effectiveAt: string } | null;
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

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<Section>("subscription");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const queryClient = useQueryClient();

  const dashboardStore = useDashboardData();
  const data = dashboardStore.initialized ? { plan: dashboardStore.plan, usage: dashboardStore.usage } : null;
  const isLoading = !dashboardStore.initialized || dashboardStore.loading;

  const { data: subscription } = useQuery<SubscriptionData>({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await fetch("/api/subscription");
      if (!res.ok) throw new Error("Failed to load subscription");
      return res.json();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/subscription", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "구독 취소에 실패했습니다.");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setShowCancelConfirm(false);
      void queryClient.invalidateQueries({ queryKey: ["subscription"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void useUserStore.getState().refresh();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const plan = data?.plan ?? "free";
  const limits = PLAN_LIMITS[plan];
  const pricing = PLAN_PRICING[plan];
  const hasSubscription = !!subscription?.subscriptionId;
  const isCancelScheduled = subscription?.scheduledChange?.action === "cancel";

  const statusLabel = subscription?.status === "active"
    ? "활성"
    : subscription?.status === "trialing"
    ? "무료 체험 중"
    : subscription?.status === "canceled"
    ? "취소됨"
    : subscription?.status === "paused"
    ? "일시 정지"
    : null;

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
        </div>

        {/* Setting Content */}
        <div className="flex-1 flex flex-col gap-6 w-full">

          {/* Subscription Section */}
          {activeSection === "subscription" && (
            isLoading ? <SkeletonCard /> : (
              <Card className="rounded-2xl border-muted shadow-sm">
                <CardHeader className="pb-4 border-b">
                  <CardTitle className="text-lg">구독 관리</CardTitle>
                  <CardDescription>현재 플랜 및 일일 사용량을 확인합니다.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-6 pt-6">
                  {/* Plan badge */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-muted">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">현재 플랜</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-foreground">{pricing.label}</span>
                        {statusLabel && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            subscription?.status === "trialing"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : subscription?.status === "active"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {statusLabel}
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

                  {/* Next billing date */}
                  {hasSubscription && subscription?.nextBillingDate && !isCancelScheduled && (
                    <div className="text-sm text-muted-foreground font-medium">
                      다음 결제일: <span className="text-foreground font-semibold">{new Date(subscription.nextBillingDate).toLocaleDateString("ko-KR")}</span>
                    </div>
                  )}

                  {/* Cancel scheduled notice */}
                  {isCancelScheduled && subscription?.scheduledChange?.effectiveAt && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
                      <AlertTriangle className="size-5 text-amber-600 shrink-0" />
                      <div className="text-sm">
                        <p className="font-semibold text-amber-800 dark:text-amber-400">구독 취소 예약됨</p>
                        <p className="text-amber-700 dark:text-amber-500">
                          {new Date(subscription.scheduledChange.effectiveAt).toLocaleDateString("ko-KR")}에 무료 플랜으로 전환됩니다.
                        </p>
                      </div>
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
                      label="AI 제목 추천"
                      used={data?.usage.title ?? 0}
                      limit={limits.dailyTitle}
                      icon={<Flame className="size-4" />}
                    />
                    <UsageBar
                      label="AI 초안 생성"
                      used={data?.usage.draft ?? 0}
                      limit={limits.dailyDraft}
                      icon={<Zap className="size-4" />}
                    />
                    <UsageBar
                      label="SEO 점수 분석"
                      used={data?.usage.score ?? 0}
                      limit={limits.dailyScore}
                      icon={<Star className="size-4" />}
                    />
                  </div>

                  {/* Upgrade CTA for free plan */}
                  {plan === "free" && (
                    <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-foreground">더 많은 기능이 필요하신가요?</span>
                        <span className="text-xs text-muted-foreground">베이직 플랜부터 무제한 검색과 AI 기능을 사용하세요.</span>
                      </div>
                      <Button asChild className="rounded-xl font-bold shrink-0">
                        <a href="/pricing">업그레이드</a>
                      </Button>
                    </div>
                  )}

                  {/* Cancel subscription for paid plans */}
                  {hasSubscription && !isCancelScheduled && (
                    <div className="border-t border-muted pt-6">
                      {!showCancelConfirm ? (
                        <button
                          type="button"
                          className="text-sm text-muted-foreground hover:text-rose-500 transition-colors font-medium cursor-pointer"
                          onClick={() => setShowCancelConfirm(true)}
                        >
                          구독 취소하기
                        </button>
                      ) : (
                        <div className="flex flex-col gap-4 p-4 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-900/20 dark:border-rose-800">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="size-5 text-rose-500 mt-0.5 shrink-0" />
                            <div className="flex flex-col gap-1">
                              <p className="text-sm font-bold text-rose-800 dark:text-rose-400">정말 구독을 취소하시겠습니까?</p>
                              <p className="text-xs text-rose-600 dark:text-rose-500">
                                현재 결제 기간이 끝나면 무료 플랜으로 전환됩니다. 유료 기능(AI 초안, 대량 분석 등)을 더 이상 사용할 수 없게 됩니다.
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <Button
                              variant="destructive"
                              size="sm"
                              className="rounded-xl font-bold"
                              disabled={cancelMutation.isPending}
                              onClick={() => cancelMutation.mutate()}
                            >
                              {cancelMutation.isPending ? "처리 중..." : "구독 취소"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl font-bold"
                              onClick={() => setShowCancelConfirm(false)}
                            >
                              유지하기
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
              <CardContent className="flex items-center justify-between pt-6">
                <span className="text-sm font-semibold text-foreground/80">서비스를 더 이상 사용하지 않으시나요?</span>
                <Button
                  variant="destructive"
                  className="rounded-xl font-bold bg-rose-500 hover:bg-rose-600"
                  onClick={() => toast.info("회원 탈퇴 기능은 준비 중입니다.")}
                >
                  회원 탈퇴
                </Button>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
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
      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium cursor-pointer transition-colors w-full text-left ${
        active
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
