import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { createServerClient } from "@/shared/lib/supabase";

/**
 * POST /api/subscription/cancel-pending
 * 예약된 pending_action(다운그레이드/업그레이드) 취소
 */
export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const supabase = await createServerClient();

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id, pending_action, status")
      .eq("user_id", user.userId)
      .eq("status", "active")
      .maybeSingle();

    if (!sub?.pending_action) {
      return NextResponse.json(
        { error: "취소할 예약된 변경이 없습니다." },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        pending_action: null,
        pending_plan: null,
        pending_start_date: null,
      })
      .eq("id", sub.id)
      .eq("status", "active");

    if (updateError) {
      console.error("[cancel-pending] DB error:", updateError.message);
      return NextResponse.json({ error: "예약 취소에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[cancel-pending] Fatal:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
