import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { createServerClient } from "@/shared/lib/supabase";
import { addDaysToKstDate, getKstDateString } from "@/shared/lib/payapp-time";

/**
 * PayApp returnurl 수신 핸들러.
 *
 * rebillRegist는 returnurl을 **파라미터 없는 GET**으로만 호출한다 (PayApp 문서 확인).
 * 따라서 결제 완료 신호로만 사용하고, 실제 활성화는 create-rebill에서 미리 박아둔
 * pending_billing 행을 active로 전환하는 방식으로 처리한다.
 *
 * Webhook(feedbackurl)이 먼저 떨어지면 이미 active 상태이므로 idempotent 하게 skip 된다.
 */
export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;

  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?callbackUrl=/settings", origin));
  }

  try {
    const supabase = await createServerClient();

    const { data: pending } = await supabase
      .from("subscriptions")
      .select("id, rebill_no, plan, status")
      .eq("user_id", user.userId)
      .eq("status", "pending_billing")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pending) {
      const todayKst = getKstDateString();
      const nextPeriodEnd = addDaysToKstDate(todayKst, 30);
      const nowIso = new Date().toISOString();

      await supabase
        .from("subscriptions")
        .update({
          status: "active",
          current_period_end: nextPeriodEnd,
          next_billing_date: nextPeriodEnd,
          last_charged_at: nowIso,
        })
        .eq("id", pending.id);
    }
  } catch (err) {
    console.error("[activate-from-return] error:", err instanceof Error ? err.message : err);
  }

  return NextResponse.redirect(new URL("/settings?from=payment", origin));
}
