import { NextResponse } from "next/server";

/**
 * POST /api/payments/payapp/activate-from-return
 *
 * Disabled for commercial safety.
 * Paid access is activated only by PayApp-backed webhook processing.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "이 경로는 비활성화되었습니다. 구독 활성화는 PayApp 결제 웹훅 확인 후 자동 처리됩니다.",
      disabled: true,
    },
    { status: 410 }
  );
}
