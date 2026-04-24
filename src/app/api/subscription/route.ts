import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { createServerClient } from "@/shared/lib/supabase";
import { getKstDateString } from "@/shared/lib/payapp-time";

/**
 * GET /api/subscription
 * pending_billing 상태(결제 미확정)는 entitlement=free로 내려준다.
 * active 또는 이용기간 남은 pending_cancel/stopped만 유효 플랜으로 간주.
 */
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const supabase = await createServerClient();
    const todayKST = getKstDateString();

    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .select("plan, status, current_period_end, next_billing_date, rebill_no")
      .eq("user_id", user.userId)
      .or(
        `status.eq.active,status.eq.pending_billing,and(status.eq.pending_cancel,current_period_end.gte.${todayKST}),and(status.eq.stopped,current_period_end.gte.${todayKST})`
      )
      .order("status", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (subError) {
      console.error("[subscription] DB error:", subError.message);
      return Response.json({ error: "구독 정보 조회에 실패했습니다." }, { status: 500 });
    }

    // pending_billing은 아직 첫 결제가 확정되지 않았으므로 entitlement는 free
    const isActiveEntitlement =
      sub &&
      (sub.status === "active" ||
        (sub.status === "pending_cancel" && sub.current_period_end) ||
        (sub.status === "stopped" && sub.current_period_end));

    const plan = isActiveEntitlement ? sub.plan ?? "free" : "free";

    return Response.json({
      plan,
      status: sub?.status ?? null,
      currentPeriodEnd: sub?.current_period_end ?? null,
      nextBillingDate: sub?.next_billing_date ?? null,
      hasPendingBilling: sub?.status === "pending_billing",
    });
  } catch (err) {
    console.error("[subscription] Fatal error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
