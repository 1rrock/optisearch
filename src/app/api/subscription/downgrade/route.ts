import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { createServerClient } from "@/shared/lib/supabase";
import { getKstDateString } from "@/shared/lib/payapp-time";

/**
 * POST /api/subscription/downgrade
 * pro → basic 다운그레이드 예약 (현재 구독 기간 만료 후 적용)
 * PayApp API 호출 없음 — 크론이 current_period_end에 처리.
 */
export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (user.plan !== "pro") {
    return NextResponse.json(
      { error: "pro 플랜 사용자만 다운그레이드할 수 있습니다." },
      { status: 400 }
    );
  }

  try {
    const supabase = await createServerClient();

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id, pending_action, current_period_end")
      .eq("user_id", user.userId)
      .eq("status", "active")
      .maybeSingle();

    if (!sub) {
      return NextResponse.json(
        { error: "활성화된 pro 구독이 없습니다." },
        { status: 400 }
      );
    }

    if (sub?.pending_action === "upgrade") {
      return NextResponse.json(
        { error: "업그레이드 예약 중입니다. 취소 후 시도하세요." },
        { status: 409 }
      );
    }

    if (sub?.pending_action === "downgrade") {
      return NextResponse.json(
        { error: "이미 다운그레이드가 예약되어 있습니다." },
        { status: 409 }
      );
    }

    // current_period_end 없으면 오늘 KST 날짜 사용 (Cron이 다음 run에 즉시 처리)
    const todayKST = getKstDateString();
    const effectiveDate = sub.current_period_end ?? todayKST;

    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        pending_plan: "basic",
        pending_action: "downgrade",
        pending_start_date: effectiveDate,
      })
      .eq("id", sub.id)
      .eq("status", "active");

    if (updateError) {
      console.error("[downgrade] DB update error:", updateError.message);
      return NextResponse.json({ error: "다운그레이드 예약에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      effectiveDate,
    });
  } catch (err) {
    console.error("[downgrade] Fatal error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
