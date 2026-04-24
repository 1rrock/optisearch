import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { createServerClient } from "@/shared/lib/supabase";
import { cancelRebill } from "@/shared/lib/payapp";

/**
 * POST /api/subscription/upgrade
 * Body: { plan: "basic" | "pro" }
 *
 * 기존 rebill을 취소하고 구독 행을 삭제한다.
 * 클라이언트는 응답 후 /checkout?plan=<new> 로 이동하여 새 rebillRegist 를 시작한다.
 * PayApp rebillRegist는 금액 변경을 지원하지 않으므로 cancel + new 패턴만 가능.
 */
export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: { plan?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const plan = body.plan;
  if (plan !== "basic" && plan !== "pro") {
    return NextResponse.json({ error: "유효하지 않은 플랜입니다." }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: current } = await supabase
    .from("subscriptions")
    .select("id, plan, rebill_no, status")
    .eq("user_id", user.userId)
    .in("status", ["active", "pending_billing"])
    .maybeSingle();

  if (!current) {
    return NextResponse.json({ ok: true, nextStep: `/checkout?plan=${plan}` });
  }

  if (current.plan === plan) {
    return NextResponse.json(
      { error: "이미 해당 플랜을 이용 중입니다." },
      { status: 400 }
    );
  }

  if (current.rebill_no) {
    try {
      await cancelRebill(current.rebill_no);
    } catch (err) {
      console.warn("[upgrade] rebillCancel best-effort failed:", err);
    }
  }

  await supabase.from("subscriptions").delete().eq("id", current.id);

  return NextResponse.json({ ok: true, nextStep: `/checkout?plan=${plan}` });
}
