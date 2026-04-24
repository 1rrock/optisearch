import { redirect } from "next/navigation";
import { createServerClient } from "@/shared/lib/supabase";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { PLAN_PRICING } from "@/shared/config/constants";
import CheckoutForm from "./_components/CheckoutForm";

type Plan = "basic" | "pro";

function isValidPlan(plan: unknown): plan is Plan {
  return plan === "basic" || plan === "pro";
}

interface CheckoutPageProps {
  searchParams: Promise<{ plan?: string }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;
  const plan = params.plan;

  if (!isValidPlan(plan)) {
    redirect("/pricing");
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/checkout?plan=${plan}`)}`);
  }

  const supabase = await createServerClient();

  // active 구독 가드
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

  const pricing = PLAN_PRICING[plan];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-10 sm:py-16 flex flex-col gap-8">
        {/* 헤더 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">구독 시작</h1>
            <Badge className="text-sm px-3 py-1 font-bold">{pricing.label}</Badge>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            카드 등록 후 첫 결제가 확인되면 {pricing.label} 플랜이 활성화됩니다.
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
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">플랜</span>
                  <span className="font-bold text-foreground">{pricing.label}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">지금 결제</span>
                  <span className="font-bold text-foreground">₩{pricing.monthly.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">다음 정기결제</span>
                  <span className="font-bold text-foreground">₩{pricing.monthly.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">변경 적용</span>
                  <span className="font-bold text-foreground">첫 결제 확인 후 즉시</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">첫 결제일</span>
                  <span className="font-bold text-foreground">카드 등록 후 결제 확인 즉시</span>
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

              {/* 자동갱신 안내 배너 */}
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 leading-relaxed">
                  카드 등록 후 첫 결제가 확인되면 이 구독은 <span className="font-black">자동으로 갱신</span>됩니다.
                  이후 매월 {pricing.monthly.toLocaleString()}원이 자동 청구되며,
                  언제든지 설정에서 다음 결제부터 해지할 수 있습니다.
                </p>
              </div>

              {/* 결제 보안 안내 */}
              <p className="text-xs text-muted-foreground text-center">
                결제는 PayApp을 통해 안전하게 처리됩니다.
              </p>
            </CardContent>
          </Card>

          {/* 우측: 결제 폼 */}
          <Card className="rounded-2xl border-muted shadow-sm">
            <CardContent className="p-6">
              <CheckoutForm plan={plan} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
