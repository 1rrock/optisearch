"use client";

import { useSession } from "next-auth/react";
import { useIsAuthenticated, useUserPlan } from "@/shared/hooks/use-user";
import { useUserStore } from "@/shared/stores/user-store";
import { CheckCircle2, X } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { PLAN_PRICING, type PlanId } from "@/shared/config/constants";
import { usePaddle } from "@/shared/providers/paddle-provider";
import { priceIdFromPlanId } from "@/shared/lib/paddle";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type FeatureValue = string | boolean;

interface Feature {
  label: string;
  free: FeatureValue;
  basic: FeatureValue;
  pro: FeatureValue;
}

const FEATURES: Feature[] = [
  { label: "키워드 검색", free: "10회/일", basic: "무제한", pro: "무제한" },
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
  { label: "오타 교정", free: true, basic: true, pro: true },
];

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === false) {
    return <X className="size-4 text-muted-foreground/40 mx-auto" />;
  }
  // Both true and string values mean the feature is available
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
  onSubscribe: (planId: PlanId) => Promise<void>;
  isLoading?: boolean;
}

function PlanCard({ planId, currentPlan, isPopular, onSubscribe, isLoading }: PlanCardProps) {
  const pricing = PLAN_PRICING[planId];
  const isCurrent = currentPlan === planId;

  // Determine plan rank to disable buttons for current or lower plans
  const planRank: Record<PlanId, number> = { free: 0, basic: 1, pro: 2 };
  const currentRank = currentPlan ? planRank[currentPlan] : -1;
  const thisRank = planRank[planId];
  const isSubscribed = currentRank >= thisRank && currentRank > 0;
  const canUpgrade = !isCurrent && thisRank > currentRank;

  const ctaLabel = isCurrent
    ? "현재 플랜"
    : isSubscribed
    ? "현재 플랜"
    : planId === "free"
    ? "무료로 시작하기"
    : planId === "basic"
    ? "베이직 시작하기"
    : "프로 시작하기";

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

        {/* Trial info — only Basic has 1-month free trial */}
        {planId === "basic" && canUpgrade && (
          <p className="text-center text-xs text-muted-foreground font-medium">
            첫 1개월 무료 체험 후 월 ₩{pricing.monthly.toLocaleString()}
          </p>
        )}

        {/* CTA */}
        <Button
          size="lg"
          variant={planId === "free" || !canUpgrade ? "outline" : "default"}
          disabled={isCurrent || isSubscribed || isLoading}
          className={[
            "w-full rounded-xl font-bold h-12",
            isPopular && canUpgrade
              ? "bg-primary shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
              : "",
          ].join(" ")}
          onClick={() => {
            if (canUpgrade && planId !== "free") {
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
  const { isAuthenticated } = useIsAuthenticated();
  const userPlan = useUserPlan();
  const { data: session } = useSession();
  const paddle = usePaddle();
  const router = useRouter();

  const currentPlan: PlanId | null = isAuthenticated ? userPlan : null;

  const handleSubscribe = async (planId: PlanId) => {
    if (planId === "free") return;

    if (!isAuthenticated) {
      toast.error("로그인이 필요합니다.");
      window.location.href = "/login?callbackUrl=/pricing";
      return;
    }

    const paddlePriceId = priceIdFromPlanId(planId);
    if (!paddlePriceId) {
      toast.error("가격 정보를 찾을 수 없습니다.");
      return;
    }

    if (!paddle) {
      toast.error("결제 시스템을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    paddle.Checkout.open({
      items: [{ priceId: paddlePriceId, quantity: 1 }],
      ...(session?.user?.email ? { customer: { email: session.user.email } } : {}),
      customData: {
        userId: session?.user?.id ?? "",
      },
      settings: {
        successUrl: `${window.location.origin}/dashboard?upgraded=true`,
      },
    });

    // Listen for checkout completion event
    paddle.Update({
      eventCallback: (event) => {
        if (event.name === "checkout.completed") {
          toast.success("결제가 완료되었습니다! 플랜을 업그레이드하고 있습니다...");
          // Poll for plan update (webhook may take a few seconds)
          let attempts = 0;
          const pollInterval = setInterval(async () => {
            attempts++;
            try {
              await useUserStore.getState().refresh();
              const newPlan = useUserStore.getState().plan;
              if (newPlan !== "free" && newPlan !== userPlan) {
                clearInterval(pollInterval);
                toast.success(`${newPlan === "pro" ? "프로" : "베이직"} 플랜으로 업그레이드되었습니다!`);
                router.push("/dashboard");
              }
            } catch {}
            if (attempts >= 15) {
              clearInterval(pollInterval);
              toast.info("플랜 반영에 시간이 걸릴 수 있습니다. 잠시 후 새로고침해주세요.");
              router.push("/dashboard");
            }
          }, 2000);
        }
      },
    });
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
        <PlanCard planId="free" currentPlan={currentPlan} onSubscribe={handleSubscribe} isLoading={false} />
        <PlanCard planId="basic" currentPlan={currentPlan} isPopular onSubscribe={handleSubscribe} isLoading={false} />
        <PlanCard planId="pro" currentPlan={currentPlan} onSubscribe={handleSubscribe} isLoading={false} />
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
    </div>
  );
}
