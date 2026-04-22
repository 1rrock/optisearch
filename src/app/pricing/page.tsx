"use client";

import { useIsAuthenticated, useUserPlan } from "@/shared/hooks/use-user";
import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { PLAN_PRICING, type PlanId } from "@/shared/config/constants";

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

interface PlanCardProps {
  planId: PlanId;
  currentPlan: PlanId | null;
  isPopular?: boolean;
  checkoutHref: string;
  currentStatus?: string;
}

function PlanCard({ planId, currentPlan, isPopular, checkoutHref, currentStatus }: PlanCardProps) {
  const pricing = PLAN_PRICING[planId];
  const isCurrent = currentStatus !== "stopped" && currentPlan === planId;

  const planRank: Record<PlanId, number> = { free: 0, basic: 1, pro: 2 };
  const currentRank = currentPlan ? planRank[currentPlan] : -1;
  const effectiveRank = currentStatus === "stopped" ? -1 : currentRank;
  const thisRank = planRank[planId];
  const isSubscribed = effectiveRank >= thisRank && effectiveRank > 0;
  const canUpgrade = !isCurrent && thisRank > effectiveRank;

  // Determine button href and label
  const isUpgradingFromBasic = currentPlan === "basic" && planId === "pro" && canUpgrade && currentStatus !== "stopped";
  const buttonHref = isUpgradingFromBasic ? "/settings" : checkoutHref;

  const ctaLabel = isCurrent
    ? "현재 플랜"
    : isSubscribed
    ? "현재 플랜"
    : planId === "free"
    ? "시작하기"
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
            {isCurrent && (
              <Badge className="text-[10px] px-2 py-0.5 font-black tracking-wide">현재 플랜</Badge>
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
  const [subStatus, setSubStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/subscription")
      .then((res) => res.json())
      .then((data) => {
        if (data?.status) setSubStatus(data.status);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  const currentPlan: PlanId | null = isAuthenticated ? userPlan : null;

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

      {/* Plan cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto w-full items-start">
        <PlanCard
          planId="free"
          currentPlan={currentPlan}
          checkoutHref={getCheckoutHref("free")}
          currentStatus={subStatus ?? undefined}
        />
        <PlanCard
          planId="basic"
          currentPlan={currentPlan}
          isPopular
          checkoutHref={getCheckoutHref("basic")}
          currentStatus={subStatus ?? undefined}
        />
        <PlanCard
          planId="pro"
          currentPlan={currentPlan}
          checkoutHref={getCheckoutHref("pro")}
          currentStatus={subStatus ?? undefined}
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
