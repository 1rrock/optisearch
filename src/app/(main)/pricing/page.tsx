"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { CheckCircle2, X } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { PLAN_PRICING, type PlanId } from "@/shared/config/constants";
import { useState } from "react";

interface DashboardData {
  plan: PlanId;
}

type FeatureValue = string | boolean;

interface Feature {
  label: string;
  free: FeatureValue;
  basic: FeatureValue;
  pro: FeatureValue;
}

const FEATURES: Feature[] = [
  { label: "키워드 검색", free: "5회/일", basic: "무제한", pro: "무제한" },
  { label: "연관 키워드", free: true, basic: true, pro: true },
  { label: "콘텐츠 포화 지수", free: true, basic: true, pro: true },
  { label: "키워드 등급", free: true, basic: true, pro: true },
  { label: "인기글 TOP7", free: false, basic: true, pro: true },
  { label: "섹션 분석", free: false, basic: true, pro: true },
  { label: "쇼핑 인사이트", free: false, basic: true, pro: true },
  { label: "트렌드", free: "기본(1개월)", basic: "1년", pro: "전체" },
  { label: "성별/연령 필터", free: false, basic: true, pro: true },
  { label: "대량 키워드", free: false, basic: "50개/회", pro: "500개/회" },
  { label: "태그 복사", free: true, basic: true, pro: true },
  { label: "검색 기록/엑셀", free: "최근 10개", basic: "무제한+엑셀", pro: "무제한+엑셀" },
  { label: "AI 제목 추천", free: "1회/일", basic: "20회/일", pro: "100회/일" },
  { label: "AI 글 초안", free: false, basic: "5회/일", pro: "30회/일" },
  { label: "AI 콘텐츠 점수", free: false, basic: "10회/일", pro: "50회/일" },
  { label: "오타 교정", free: true, basic: true, pro: true },
];

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === true) {
    return <CheckCircle2 className="size-5 text-primary mx-auto" />;
  }
  if (value === false) {
    return <X className="size-4 text-muted-foreground/40 mx-auto" />;
  }
  return <span className="text-sm font-semibold text-foreground">{value}</span>;
}

interface PlanCardProps {
  planId: PlanId;
  currentPlan: PlanId | null;
  isPopular?: boolean;
  onSubscribe: (planId: PlanId) => Promise<void>;
  isLoading?: boolean;
}

function PlanCard({ planId, currentPlan, isPopular, onSubscribe, isLoading }: PlanCardProps) {
  const pricing = PLAN_PRICING[planId];
  const isCurrent = currentPlan === planId;

  const ctaLabel =
    planId === "free"
      ? "현재 플랜"
      : planId === "basic"
      ? "베이직 시작하기"
      : "프로 시작하기";

  return (
    <Card
      className={[
        "relative flex flex-col rounded-3xl transition-all",
        isPopular
          ? "border-2 border-primary shadow-2xl scale-[1.03] z-10"
          : "border border-muted/50 hover:border-primary/30",
      ].join(" ")}
    >
      {isPopular && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase shadow-lg shadow-primary/30">
          인기
        </div>
      )}

      <CardContent className="flex flex-col flex-1 p-8 pt-10 gap-6">
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
            <span className="text-4xl font-black text-foreground">
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
          size="lg"
          variant={planId === "free" ? "outline" : "default"}
          disabled={(isCurrent && planId === "free") || isLoading}
          className={[
            "w-full rounded-xl font-bold h-12 mt-2",
            isPopular
              ? "bg-primary shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
              : "",
          ].join(" ")}
          onClick={() => {
            if (planId !== "free") {
              void onSubscribe(planId);
            }
          }}
        >
          {ctaLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function PricingPage() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);

  const { data } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const currentPlan: PlanId | null = data?.plan ?? (isAuthenticated ? "free" : null);

  const handleSubscribe = async (planId: PlanId) => {
    if (planId === "free") return;
    setLoadingPlan(planId);
    try {
      const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk");
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey) {
        alert("결제 설정이 올바르지 않습니다.");
        return;
      }

      const tossPayments = await loadTossPayments(clientKey);
      // Use a stable customer key derived from the current timestamp.
      // Toss will return it back as a query param on redirect.
      const customerKey = `user_${Date.now()}`;
      const payment = tossPayments.payment({ customerKey });

      await payment.requestBillingAuth({
        method: "CARD",
        successUrl: `${window.location.origin}/billing/success?plan=${planId}`,
        failUrl: `${window.location.origin}/pricing?error=payment_failed`,
      });
      // requestBillingAuth redirects the page, so nothing runs after this.
    } catch (err) {
      const message = err instanceof Error ? err.message : "결제 시작 중 오류가 발생했습니다.";
      alert(message);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="flex flex-col gap-10 w-full">
      {/* Page header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 text-foreground">요금제</h2>
        <p className="text-muted-foreground">
          나에게 맞는 플랜을 선택하고 더 많은 기능을 활용하세요.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto w-full items-start">
        <PlanCard planId="free" currentPlan={currentPlan} onSubscribe={handleSubscribe} isLoading={loadingPlan === "free"} />
        <PlanCard planId="basic" currentPlan={currentPlan} isPopular onSubscribe={handleSubscribe} isLoading={loadingPlan === "basic"} />
        <PlanCard planId="pro" currentPlan={currentPlan} onSubscribe={handleSubscribe} isLoading={loadingPlan === "pro"} />
      </div>

      {/* Feature comparison table (desktop) */}
      <div className="max-w-5xl mx-auto w-full mt-4 hidden md:block">
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
                  <td className="py-4 px-4 text-center">
                    {typeof f.free === "boolean" ? (
                      f.free ? (
                        <CheckCircle2 className="size-5 text-primary/60 mx-auto" />
                      ) : (
                        <X className="size-4 text-muted-foreground/30 mx-auto" />
                      )
                    ) : (
                      <span className="text-muted-foreground font-medium">{f.free}</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center bg-primary/5">
                    {typeof f.basic === "boolean" ? (
                      f.basic ? (
                        <CheckCircle2 className="size-5 text-primary mx-auto" />
                      ) : (
                        <X className="size-4 text-muted-foreground/30 mx-auto" />
                      )
                    ) : (
                      <span className="text-primary font-semibold">{f.basic}</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {typeof f.pro === "boolean" ? (
                      f.pro ? (
                        <CheckCircle2 className="size-5 text-primary/60 mx-auto" />
                      ) : (
                        <X className="size-4 text-muted-foreground/30 mx-auto" />
                      )
                    ) : (
                      <span className="text-muted-foreground font-medium">{f.pro}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
