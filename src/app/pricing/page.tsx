"use client";

import { useIsAuthenticated, useUserPlan } from "@/shared/hooks/use-user";
import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import Link from "next/link";
import { calcProRatedDiff } from "@/shared/lib/subscription-upgrade-rules";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { PLAN_PRICING, UPGRADE_DIFF, type PlanId } from "@/shared/config/constants";

type FeatureValue = string | boolean;

interface Feature {
  label: string;
  free: FeatureValue;
  basic: FeatureValue;
  pro: FeatureValue;
}

const FEATURES: Feature[] = [
  { label: "키워드 검색", free: "10회/일", basic: "300회/일", pro: "무제한" },
  { label: "연관 키워드", free: true, basic: true, pro: true },
  { label: "콘텐츠 포화 지수", free: true, basic: true, pro: true },
  { label: "키워드 등급", free: true, basic: true, pro: true },
  { label: "인기글", free: "TOP3", basic: "TOP7", pro: "TOP7" },
  { label: "섹션 분석", free: false, basic: true, pro: true },
  { label: "쇼핑 인사이트", free: false, basic: true, pro: true },
  { label: "트렌드", free: "3개월", basic: "1년", pro: "전체" },
  { label: "성별/연령 필터", free: false, basic: true, pro: true },
  { label: "대량 키워드", free: false, basic: "50개/회", pro: "500개/회" },
  { label: "태그 복사", free: true, basic: true, pro: true },
  { label: "검색 기록/엑셀", free: "최근 10개", basic: "무제한+엑셀", pro: "무제한+엑셀" },
  { label: "AI 제목 추천", free: "3회/일", basic: "20회/일", pro: "100회/일" },
  { label: "AI 글 초안", free: "1회/일", basic: "5회/일", pro: "30회/일" },
  { label: "AI 콘텐츠 점수", free: "1회/일", basic: "10회/일", pro: "50회/일" },
  { label: "순위 추적", free: "3개", basic: "20개", pro: "무제한" },
  { label: "오타 교정", free: true, basic: true, pro: true },
];

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === false) {
    return <X className="size-4 text-muted-foreground/40 mx-auto" />;
  }
  return <CheckCircle2 className="size-5 text-primary mx-auto" />;
}

function TableFeatureCell({ value }: { value: FeatureValue }) {
  if (value === true) {
    return <CheckCircle2 className="size-5 text-primary mx-auto" />;
  }
  if (value === false) {
    return <X className="size-4 text-muted-foreground/30 mx-auto" />;
  }
  return <span className="text-sm font-semibold text-foreground">{value}</span>;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function formatAmount(amount: number): string {
  return `${amount.toLocaleString()}원`;
}

function getTodayKstDateString(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function isGracePeriodEligible(status: string | null | undefined, currentPeriodEnd: string | null | undefined): boolean {
  return (
    !!currentPeriodEnd &&
    (status === "pending_cancel" || status === "stopped") &&
    currentPeriodEnd >= getTodayKstDateString()
  );
}

interface PlanCardProps {
  planId: PlanId;
  currentPlan: PlanId | null;
  isPopular?: boolean;
  checkoutHref: string;
  currentStatus?: string;
  currentPeriodEnd?: string | null;
}

function PlanCard({ planId, currentPlan, isPopular, checkoutHref, currentStatus, currentPeriodEnd }: PlanCardProps) {
  const pricing = PLAN_PRICING[planId];
  const hasGracePeriod = isGracePeriodEligible(currentStatus, currentPeriodEnd);
  const isGraceCurrentPlan = hasGracePeriod && currentPlan === planId;
  const isGraceBasicToPro = hasGracePeriod && currentPlan === "basic" && planId === "pro";
  const isPendingBilling = currentStatus === "pending_billing";
  const graceUpgradeAmount = isGraceBasicToPro
    ? calcProRatedDiff(UPGRADE_DIFF.basicToPro, currentPeriodEnd ?? null)
    : null;
  const isCurrent = currentStatus !== "stopped" && currentPlan === planId && !hasGracePeriod;

  const planRank: Record<PlanId, number> = { free: 0, basic: 1, pro: 2 };
  const currentRank = currentPlan ? planRank[currentPlan] : -1;
  const effectiveRank = currentStatus === "stopped" ? -1 : currentRank;
  const thisRank = planRank[planId];
  const isSubscribed = !isGraceCurrentPlan && effectiveRank >= thisRank && effectiveRank > 0;
  const canUpgrade = !isCurrent && thisRank > effectiveRank;

  // Determine button href and label
  const isUpgradingFromBasic = currentPlan === "basic" && planId === "pro" && canUpgrade && currentStatus !== "stopped" && !hasGracePeriod && !isPendingBilling;
  const buttonHref = isPendingBilling ? "/settings?pending=1" : isUpgradingFromBasic ? "/settings" : checkoutHref;

  const ctaLabel = isCurrent
    ? "현재 플랜"
    : isPendingBilling
    ? "설정에서 확인"
    : isUpgradingFromBasic
    ? "설정에서 업그레이드"
    : isGraceCurrentPlan
    ? currentStatus === "pending_cancel"
      ? "만료 후 계속 사용"
      : "재구독"
    : isSubscribed
    ? "현재 플랜"
    : planId === "free"
    ? "시작하기"
    : isGraceBasicToPro
    ? "즉시 업그레이드"
    : currentStatus === "stopped" && currentPlan === planId
    ? "재구독"
    : "결제하기";

  return (
    <Card
      className={[
        "relative flex flex-col rounded-3xl transition-all",
        isPopular
          ? "border-2 border-primary shadow-2xl md:scale-[1.03] z-10"
          : "border border-muted/50 hover:border-primary/30",
      ].join(" ")}
    >
      {isPopular && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase shadow-lg shadow-primary/30">
          인기
        </div>
      )}

      <CardContent className="flex flex-col flex-1 p-5 sm:p-8 pt-8 sm:pt-10 gap-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${isPopular ? "text-primary" : "text-muted-foreground"}`}>
              {pricing.label}
            </span>
            {(isCurrent || isGraceCurrentPlan) && (
              <Badge className="text-[10px] px-2 py-0.5 font-black tracking-wide">
                {isCurrent ? "현재 플랜" : "현재 권한"}
              </Badge>
            )}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl font-black text-foreground">
              ₩{pricing.monthly.toLocaleString()}
            </span>
            {pricing.monthly > 0 && (
              <span className="text-sm font-semibold text-muted-foreground">/월</span>
            )}
          </div>
        </div>

        {/* Feature list */}
        <ul className="flex flex-col gap-3 flex-1">
          {FEATURES.map((f) => {
            const val = f[planId];
            return (
              <li key={f.label} className="flex items-center gap-3">
                <div className="shrink-0 w-5 flex justify-center">
                  <FeatureCell value={val} />
                </div>
                <span
                  className={`text-sm font-medium ${
                    val === false ? "text-muted-foreground/50 line-through" : "text-foreground"
                  }`}
                >
                  {f.label}
                  {typeof val === "string" && (
                    <span className="ml-1 text-xs text-muted-foreground font-normal">({val})</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>

        {/* CTA */}
        <Button
          asChild
          size="lg"
          variant={!canUpgrade && planId !== "free" ? "outline" : planId === "free" ? "outline" : "default"}
          disabled={isCurrent || isSubscribed}
          className={[
            "w-full rounded-xl font-bold h-12",
            isPopular && canUpgrade
              ? "bg-primary shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
              : "",
          ].join(" ")}
        >
          <Link href={buttonHref}>{ctaLabel}</Link>
        </Button>

        {isGraceCurrentPlan && currentPeriodEnd && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {formatDate(currentPeriodEnd)}까지 현재 권한 유지 · 이후 {pricing.label} 월 {formatAmount(pricing.monthly)} 정기결제 재개
          </p>
        )}

        {isGraceBasicToPro && currentPeriodEnd && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {graceUpgradeAmount === 0
              ? "오늘 추가 결제 없이 프로 권한이 바로 적용되고"
              : `오늘 ${formatAmount(graceUpgradeAmount ?? 0)} 즉시 결제 후 프로 권한이 바로 적용되고`} 다음 정기결제는 {formatDate(currentPeriodEnd)}부터 월 {formatAmount(PLAN_PRICING.pro.monthly)}입니다.
          </p>
        )}

        {isUpgradingFromBasic && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            현재 베이직 사용 중이라 프로 변경은 설정에서 차액 결제로 진행됩니다.
          </p>
        )}

        {isPendingBilling && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            현재 결제 진행 상태를 먼저 확인해야 합니다. 새 결제는 설정의 구독 관리에서 이어서 처리하세요.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function PricingPage() {
  return <PricingContent />;
}

function PricingContent() {
  const { isAuthenticated } = useIsAuthenticated();
  const userPlan = useUserPlan();
  const [subInfo, setSubInfo] = useState<{ status: string | null; currentPeriodEnd: string | null }>({
    status: null,
    currentPeriodEnd: null,
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/subscription")
      .then((res) => res.json())
      .then((data) => {
        setSubInfo({
          status: data?.status ?? null,
          currentPeriodEnd: data?.currentPeriodEnd ?? null,
        });
      })
      .catch(() => {});
  }, [isAuthenticated]);

  const currentPlan: PlanId | null = isAuthenticated ? userPlan : null;
  const hasGracePeriodEntitlement = isGracePeriodEligible(subInfo.status, subInfo.currentPeriodEnd) && !!currentPlan && currentPlan !== "free";
  const graceUpgradeAmount =
    currentPlan === "basic" && hasGracePeriodEntitlement
      ? calcProRatedDiff(UPGRADE_DIFF.basicToPro, subInfo.currentPeriodEnd)
      : null;
  const hasPendingBilling = subInfo.status === "pending_billing";

  const checkoutPathByPlan: Record<PlanId, string> = {
    free: "/dashboard",
    basic: "/checkout?plan=basic",
    pro: "/checkout?plan=pro",
  };

  const getCheckoutHref = (planId: PlanId) => {
    const targetPath = checkoutPathByPlan[planId];
    if (isAuthenticated) {
      return targetPath;
    }
    return `/login?callbackUrl=${encodeURIComponent(targetPath)}`;
  };

  return (
    <div className="flex flex-col gap-8 sm:gap-10 w-full">
      {/* Page header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 text-foreground">요금제</h2>
        <p className="text-muted-foreground">
          나에게 맞는 플랜을 선택하고 더 많은 기능을 활용하세요.
        </p>
      </div>

      {hasPendingBilling && (
        <div className="max-w-5xl mx-auto w-full rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-foreground">결제 진행 중인 구독이 있습니다</span>
            <span className="text-xs text-muted-foreground">
              새 결제를 시작하기보다 설정에서 현재 진행 상태를 확인하거나 취소하는 것이 안전합니다.
            </span>
          </div>
          <Button asChild className="rounded-xl font-bold w-full sm:w-auto">
            <Link href="/settings?pending=1">구독 관리로 이동</Link>
          </Button>
        </div>
      )}

      {hasGracePeriodEntitlement && currentPlan && subInfo.currentPeriodEnd && (
        <div className="max-w-5xl mx-auto w-full rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="font-bold">
                {subInfo.status === "pending_cancel" ? "해지 예정" : "해지됨"}
              </Badge>
              <span className="text-sm font-bold text-foreground">
                현재 {PLAN_PRICING[currentPlan].label} 권한은 {formatDate(subInfo.currentPeriodEnd)}까지 유지됩니다.
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              같은 플랜을 계속 쓰면 {formatDate(subInfo.currentPeriodEnd)}부터 {PLAN_PRICING[currentPlan].label} 월 {formatAmount(PLAN_PRICING[currentPlan].monthly)} 정기결제가 다시 시작됩니다.
              {currentPlan === "basic" && graceUpgradeAmount !== null && (
                <>
                  {" "}
                  프로로 변경하면 {graceUpgradeAmount === 0 ? "오늘 추가 결제 없이" : `오늘 ${formatAmount(graceUpgradeAmount)} 즉시 결제 후`} 프로 권한이 바로 적용되고, 다음 정기결제는 {formatDate(subInfo.currentPeriodEnd)}부터 월 {formatAmount(PLAN_PRICING.pro.monthly)}입니다.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild variant="outline" className="rounded-xl font-bold w-full sm:w-auto">
              <Link href={getCheckoutHref(currentPlan)}>
                {subInfo.status === "pending_cancel" ? "같은 플랜 계속 사용" : "같은 플랜 재구독"}
              </Link>
            </Button>
            {currentPlan === "basic" && (
              <Button asChild className="rounded-xl font-bold w-full sm:w-auto">
                <Link href={getCheckoutHref("pro")}>프로로 바로 업그레이드</Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto w-full items-start">
        <PlanCard
          planId="free"
          currentPlan={currentPlan}
          checkoutHref={getCheckoutHref("free")}
          currentStatus={subInfo.status ?? undefined}
          currentPeriodEnd={subInfo.currentPeriodEnd}
        />
        <PlanCard
          planId="basic"
          currentPlan={currentPlan}
          isPopular
          checkoutHref={getCheckoutHref("basic")}
          currentStatus={subInfo.status ?? undefined}
          currentPeriodEnd={subInfo.currentPeriodEnd}
        />
        <PlanCard
          planId="pro"
          currentPlan={currentPlan}
          checkoutHref={getCheckoutHref("pro")}
          currentStatus={subInfo.status ?? undefined}
          currentPeriodEnd={subInfo.currentPeriodEnd}
        />
      </div>

      {/* Feature comparison table (desktop) */}
      <div className="max-w-5xl mx-auto w-full mt-4 hidden lg:block">
        <div className="bg-card rounded-3xl border border-muted/50 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-muted/30 border-b border-muted/50">
              <tr>
                <th className="py-5 px-6 font-bold text-muted-foreground text-sm w-1/2">기능</th>
                <th className="py-5 px-4 font-bold text-muted-foreground text-sm text-center">무료</th>
                <th className="py-5 px-4 font-black text-primary text-sm text-center bg-primary/5">베이직</th>
                <th className="py-5 px-4 font-bold text-muted-foreground text-sm text-center">프로</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/30 text-sm">
              {FEATURES.map((f) => (
                <tr key={f.label} className="hover:bg-muted/10 transition-colors">
                  <td className="py-4 px-6 font-semibold text-foreground">{f.label}</td>
                  <td className="py-4 px-4 text-center"><TableFeatureCell value={f.free} /></td>
                  <td className="py-4 px-4 text-center bg-primary/5"><TableFeatureCell value={f.basic} /></td>
                  <td className="py-4 px-4 text-center"><TableFeatureCell value={f.pro} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer with policy links */}
      <div className="text-xs text-muted-foreground text-center mt-4 max-w-5xl mx-auto w-full">
        <Link href="/terms#refund" className="hover:underline">
          환불정책
        </Link>
        {" · "}
        <Link href="/terms" className="hover:underline">
          이용약관
        </Link>
        {" · "}
        <Link href="/privacy" className="hover:underline">
          개인정보처리방침
        </Link>
      </div>
    </div>
  );
}
