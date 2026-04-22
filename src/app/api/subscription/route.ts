import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { createServerClient } from "@/shared/lib/supabase";
import { getKstDateString } from "@/shared/lib/payapp-time";

/**
 * GET /api/subscription — 현재 구독(플랜) 정보 조회
 * 반환: plan, status, currentPeriodEnd, pendingAction, pendingPlan, pendingStartDate
 */
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const supabase = await createServerClient();

    // getAuthenticatedUser가 이미 subscriptions에서 plan을 읽어오므로
    // 여기서는 추가 정보만 조회
    // stopped 상태이더라도 current_period_end가 오늘 이후이면 유효 구독으로 간주
    const todayKST = getKstDateString();
    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .select("plan, status, current_period_end, pending_action, pending_plan, pending_start_date, failed_charge_count")
      .eq("user_id", user.userId)
      .or(`status.eq.active,status.eq.pending_billing,and(status.eq.pending_cancel,current_period_end.gte.${todayKST}),and(status.eq.stopped,current_period_end.gte.${todayKST})`)
      .order("status", { ascending: true }) // 'active' sorts before 'stopped'
      .limit(1)
      .maybeSingle();

    if (subError) {
      console.error("[subscription] DB error:", subError.message);
      return Response.json({ error: "구독 정보 조회에 실패했습니다." }, { status: 500 });
    }

    // 활성 구독(또는 기간 내 stopped)이 없으면 free
    const plan = sub ? (sub.plan ?? "free") : "free";

    return Response.json({
      plan,
      status: sub?.status ?? null,
      currentPeriodEnd: sub?.current_period_end ?? null,
      pendingAction: sub?.pending_action ?? null,
      pendingPlan: sub?.pending_plan ?? null,
      pendingStartDate: sub?.pending_start_date ?? null,
      failedChargeCount: sub?.failed_charge_count ?? 0,
    });
  } catch (err) {
    console.error("[subscription] Fatal error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
