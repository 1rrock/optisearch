import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { createServerClient } from "@/shared/lib/supabase";
import { cancelRebill, stopRebill, isPayAppTimeoutError } from "@/shared/lib/payapp";

/**
 * POST /api/subscription/cancel
 *
 * - pending_billing (결제 전): rebillCancel → DB 행 삭제
 * - active (정기결제 중): rebillStop → status=pending_cancel 로 전환 (이용 기간까지 사용)
 * - pending_cancel (이미 해지): 멱등 204
 */
export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { data: subscription, error: subError } = await supabase
    .from("subscriptions")
    .select("id, rebill_no, status, current_period_end")
    .eq("user_id", user.userId)
    .in("status", ["active", "pending_billing", "pending_cancel"])
    .maybeSingle();

  if (subError) {
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }
  if (!subscription) {
    return NextResponse.json({ error: "해지할 구독이 없습니다." }, { status: 400 });
  }
  if (subscription.status === "pending_cancel") {
    return NextResponse.json({ ok: true, alreadyCancelled: true });
  }

  try {
    if (subscription.status === "pending_billing") {
      if (subscription.rebill_no) {
        await cancelRebill(subscription.rebill_no).catch((err) => {
          console.warn("[cancel] rebillCancel best-effort failed:", err);
        });
      }
      await supabase.from("subscriptions").delete().eq("id", subscription.id);
      return NextResponse.json({ ok: true, cleared: true });
    }

    // active → pending_cancel (이용기간까지 유지)
    if (!subscription.rebill_no) {
      return NextResponse.json({ error: "rebill 정보가 없습니다." }, { status: 500 });
    }

    const result = await stopRebill(subscription.rebill_no);
    if (result.state !== 1) {
      return NextResponse.json(
        { error: result.errorMessage ?? "해지 요청에 실패했습니다." },
        { status: 502 }
      );
    }

    await supabase
      .from("subscriptions")
      .update({
        status: "pending_cancel",
        canceled_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    return NextResponse.json({
      ok: true,
      currentPeriodEnd: subscription.current_period_end,
    });
  } catch (err) {
    if (isPayAppTimeoutError(err)) {
      return NextResponse.json({ error: "PayApp 응답 지연" }, { status: 504 });
    }
    console.error("[cancel] unexpected error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
