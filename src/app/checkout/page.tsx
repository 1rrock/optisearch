import { redirect } from "next/navigation";
import { createServerClient } from "@/shared/lib/supabase";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { PLAN_PRICING, UPGRADE_DIFF } from "@/shared/config/constants";
import { getKstDateString } from "@/shared/lib/payapp-time";
import { calcProRatedDiff } from "@/shared/lib/subscription-upgrade-rules";
import CheckoutForm from "./_components/CheckoutForm";

type Plan = "basic" | "pro";

function isValidPlan(plan: unknown): plan is Plan {
  return plan === "basic" || plan === "pro";
}

interface CheckoutPageProps {
  searchParams: Promise<{ plan?: string }>;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;
  const plan = params.plan;

  if (!isValidPlan(plan)) {
    redirect("/pricing");
  }

  // 올바른 user ID (profile UUID) 사용
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/checkout?plan=${plan}`)}`);
  }

  const supabase = await createServerClient();

  // active 구독 가드 — profile UUID로 조회
  const { data: activeSub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.userId)
    .eq("status", "active")
    .maybeSingle();

  if (activeSub) {
    redirect("/settings?already=1");
  }

  const { data: pendingBillingSub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.userId)
    .eq("status", "pending_billing")
    .maybeSingle();

  if (pendingBillingSub) {
    redirect("/settings?pending=1");
  }

  // pending_cancel / stopped 구독 조회 → grace period 계산
  const todayKST = getKstDateString();

  const { data: graceSub } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, plan")
    .eq("user_id", user.userId)
    .in("status", ["pending_cancel", "stopped"])
    .maybeSingle();

  const hasGracePeriod =
    !!graceSub?.current_period_end &&
    graceSub.current_period_end >= todayKST;

  const nextBillingDate = hasGracePeriod ? graceSub!.current_period_end : null;
  const currentEntitlementPlan = hasGracePeriod ? (graceSub!.plan as Plan) : null;
  const currentEntitlementStatus = hasGracePeriod ? String(graceSub!.status) : null;
  const isGracePeriodUpgrade =
    hasGracePeriod &&
    graceSub!.plan === "basic" &&
    plan === "pro";
  const immediateChargeAmount = isGracePeriodUpgrade
    ? calcProRatedDiff(UPGRADE_DIFF.basicToPro, nextBillingDate)
    : null;

  const pricing = PLAN_PRICING[plan];

  // 결제일 표시 문자열
  const billingDateLabel = nextBillingDate
    ? formatDateLabel(nextBillingDate)
    : "카드 등록 후 결제 확인 즉시";

  const currentEntitlementPricing = currentEntitlementPlan
    ? PLAN_PRICING[currentEntitlementPlan as Plan]
    : null;
  const currentEntitlementLabel = currentEntitlementPricing?.label ?? "무료";
  const currentStatusLabel =
    currentEntitlementStatus === "pending_cancel"
      ? "해지 예정"
      : currentEntitlementStatus === "stopped"
      ? "해지됨"
      : null;
  const immediateChargeLabel =
    immediateChargeAmount === null
      ? null
      : immediateChargeAmount === 0
      ? "추가 결제 없음"
      : `₩${immediateChargeAmount.toLocaleString()}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-10 sm:py-16 flex flex-col gap-8">
        {/* 헤더 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {isGracePeriodUpgrade ? "프로 즉시 업그레이드" : hasGracePeriod ? "카드 등록" : "구독 시작"}
            </h1>
            <Badge className="text-sm px-3 py-1 font-bold">{pricing.label}</Badge>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {isGracePeriodUpgrade
              ? `현재 ${currentEntitlementLabel} 이용 권한은 ${billingDateLabel}까지 유지됩니다. ${immediateChargeAmount === 0 ? "오늘은 추가 결제 없이" : `오늘 ${immediateChargeAmount?.toLocaleString()}원이 즉시 결제되고`} 결제 확인 후 프로 권한이 바로 적용되며, 다음 정기결제는 ${billingDateLabel}부터 시작됩니다.`
              : hasGracePeriod
              ? `현재 ${currentEntitlementLabel} 이용 권한은 ${billingDateLabel}까지 유지됩니다. 카드를 등록하면 ${billingDateLabel}부터 ${pricing.label} 정기결제가 시작됩니다.`
              : `카드 등록 후 첫 결제가 확인되면 ${pricing.label} 플랜이 활성화됩니다.`}
          </p>
        </div>

        {/* 2칼럼 레이아웃 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* 좌측: 플랜 요약 카드 */}
          <Card className="rounded-2xl border-muted shadow-sm">
            <CardContent className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">선택한 플랜</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-black text-foreground">
                    ₩{pricing.monthly.toLocaleString()}
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground">/월</span>
                </div>
                <p className="text-xs text-muted-foreground font-medium">VAT 포함</p>
              </div>

              <div className="border-t border-muted" />

              {/* 결제 정보 */}
              <div className="flex flex-col gap-3">
                {hasGracePeriod && currentStatusLabel && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">현재 이용 권한</span>
                    <span className="font-bold text-foreground">
                      {currentEntitlementLabel} ({currentStatusLabel})
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">플랜</span>
                  <span className="font-bold text-foreground">{pricing.label}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">지금 결제</span>
                  <span className="font-bold text-foreground">
                    {isGracePeriodUpgrade
                      ? immediateChargeLabel
                      : hasGracePeriod
                      ? "없음 (카드 등록만)"
                      : `₩${pricing.monthly.toLocaleString()}`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">다음 정기결제</span>
                  <span className="font-bold text-foreground">₩{pricing.monthly.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">변경 적용</span>
                  <span className="font-bold text-foreground">
                    {isGracePeriodUpgrade ? "결제 확인 후 즉시" : hasGracePeriod ? `${billingDateLabel}부터` : "첫 결제 확인 후 즉시"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">
                    {hasGracePeriod ? "다음 결제일" : "첫 결제일"}
                  </span>
                  <span className="font-bold text-foreground">{billingDateLabel}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">결제 주기</span>
                  <span className="font-bold text-foreground">매월 자동 결제</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">부가세</span>
                  <span className="font-medium text-muted-foreground">VAT 포함가</span>
                </div>
              </div>

              <div className="border-t border-muted" />

              {/* 자동갱신 경고 배너 */}
              {isGracePeriodUpgrade ? (
                <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 leading-relaxed">
                    현재 <span className="font-black">{currentEntitlementLabel}</span> 권한은 그대로 유지되며,
                    {immediateChargeAmount === 0
                      ? " 추가 결제 없이 결제 확인 후 곧바로 프로 권한이 적용됩니다."
                      : ` 오늘 ${immediateChargeAmount?.toLocaleString()}원의 비례 업그레이드 금액이 즉시 결제되고, 결제 확인 후 프로 권한이 바로 적용됩니다.`}
                    다음 정기결제는 <span className="font-black">{billingDateLabel}</span>부터
                    {` ${pricing.monthly.toLocaleString()}원`}으로 청구됩니다.
                  </p>
                </div>
              ) : hasGracePeriod ? (
                <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 leading-relaxed">
                    현재 이용 기간(<span className="font-black">{billingDateLabel}</span>)이 종료된 후
                    {pricing.label} 정기결제가 시작됩니다. 지금은 카드만 등록하며 즉시 결제되지 않습니다.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 leading-relaxed">
                    카드 등록 후 첫 결제가 확인되면 이 구독은 <span className="font-black">자동으로 갱신</span>됩니다.
                    이후 매월 {pricing.monthly.toLocaleString()}원이 자동 청구되며,
                    언제든지 설정에서 다음 결제부터 해지할 수 있습니다.
                  </p>
                </div>
              )}

              {/* 결제 보안 안내 */}
              <p className="text-xs text-muted-foreground text-center">
                결제는 PayApp을 통해 안전하게 처리됩니다.
              </p>
            </CardContent>
          </Card>

          {/* 우측: 결제 폼 */}
          <Card className="rounded-2xl border-muted shadow-sm">
            <CardContent className="p-6">
              <CheckoutForm
                plan={plan}
                nextBillingDate={nextBillingDate}
                currentEntitlementPlan={currentEntitlementPlan}
                isGracePeriodUpgrade={isGracePeriodUpgrade}
                immediateChargeAmount={immediateChargeAmount}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
