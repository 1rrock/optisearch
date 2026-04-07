import { NextResponse } from "next/server";
import { createServerClient } from "@/shared/lib/supabase";
import {
  NICEPAY_CONFIG,
  PLAN_AMOUNT_MAP,
  getBasicAuthHeader,
  verifyReturnSignature,
  parseOrderId,
} from "@/shared/lib/nicepay";

/**
 * POST /api/nicepay/callback
 *
 * NicePay returnUrl — 카드 인증 후 사용자 브라우저가 POST로 리다이렉트됨.
 * 인증 결과 확인 → 승인 API 호출 → plan 업데이트 → 대시보드 리다이렉트.
 */
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;

  try {
    // NicePay sends application/x-www-form-urlencoded
    const formData = await request.formData();
    const authResultCode = formData.get("authResultCode") as string;
    const authResultMsg = formData.get("authResultMsg") as string;
    const tid = formData.get("tid") as string;
    const clientId = formData.get("clientId") as string;
    const orderId = formData.get("orderId") as string;
    const amount = formData.get("amount") as string;
    const authToken = formData.get("authToken") as string;
    const signature = formData.get("signature") as string;

    // 1. 인증 결과 확인
    if (authResultCode !== "0000") {
      console.error("[nicepay/callback] Auth failed:", authResultCode, authResultMsg);
      return NextResponse.redirect(
        `${origin}/pricing?error=auth_failed&msg=${encodeURIComponent(authResultMsg ?? "인증 실패")}`,
        { status: 302 }
      );
    }

    // 2. 서명 검증
    if (signature && !verifyReturnSignature(authToken, clientId, amount, signature)) {
      console.error("[nicepay/callback] Signature mismatch");
      return NextResponse.redirect(`${origin}/pricing?error=signature_failed`, { status: 302 });
    }

    // 3. orderId 파싱 → planId, userId 추출
    const parsed = parseOrderId(orderId);
    if (!parsed) {
      console.error("[nicepay/callback] Invalid orderId:", orderId);
      return NextResponse.redirect(`${origin}/pricing?error=invalid_order`, { status: 302 });
    }

    // 4. 금액 검증 (변조 방지)
    const expectedAmount = PLAN_AMOUNT_MAP[parsed.planId];
    if (Number(amount) !== expectedAmount) {
      console.error("[nicepay/callback] Amount mismatch:", amount, "expected:", expectedAmount);
      return NextResponse.redirect(`${origin}/pricing?error=amount_mismatch`, { status: 302 });
    }

    // 5. 승인 API 호출
    const approvalRes = await fetch(
      `${NICEPAY_CONFIG.baseUrl}/v1/payments/${tid}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=utf-8",
          Authorization: getBasicAuthHeader(),
        },
        body: JSON.stringify({ amount: Number(amount) }),
      }
    );

    const approvalData = await approvalRes.json();

    if (approvalData.resultCode !== "0000") {
      console.error("[nicepay/callback] Approval failed:", approvalData);
      return NextResponse.redirect(
        `${origin}/pricing?error=payment_failed&msg=${encodeURIComponent(approvalData.resultMsg ?? "결제 실패")}`,
        { status: 302 }
      );
    }

    // 6. DB 업데이트: plan 변경 + NicePay 거래 정보 저장
    const supabase = await createServerClient();

    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        plan: parsed.planId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.userId)
      .single();

    // id로 못 찾으면 auth_user_id로 시도
    if (updateError) {
      const { error: fallbackError } = await supabase
        .from("user_profiles")
        .update({
          plan: parsed.planId,
          updated_at: new Date().toISOString(),
        })
        .eq("auth_user_id", parsed.userId)
        .single();

      if (fallbackError) {
        console.error("[nicepay/callback] DB update failed:", fallbackError);
        // 결제는 성공했으므로 에러 페이지로 보내되 거래번호 전달
        return NextResponse.redirect(
          `${origin}/pricing?error=db_failed&tid=${tid}`,
          { status: 302 }
        );
      }
    }

    // 7. 웹훅 이벤트 기록 (중복 방지용)
    try {
      await supabase
        .from("webhook_events")
        .insert({
          event_id: tid,
          event_type: "nicepay.payment.approved",
          processed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
    } catch {
      // 중복이면 무시
    }

    console.log("[nicepay/callback] Success:", {
      tid,
      orderId,
      planId: parsed.planId,
      userId: parsed.userId,
      amount,
    });

    // 8. 대시보드로 리다이렉트
    return NextResponse.redirect(
      `${origin}/dashboard?payment=success&plan=${parsed.planId}`,
      { status: 302 }
    );
  } catch (err) {
    console.error("[nicepay/callback] Unexpected error:", err);
    return NextResponse.redirect(`${origin}/pricing?error=server_error`, { status: 302 });
  }
}
