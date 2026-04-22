import { NextResponse } from "next/server";

/**
 * @deprecated POST /api/payments/payapp/create-rebill
 *
 * 이 엔드포인트는 deprecated입니다.
 * 신규 구독은 /api/payments/payapp/register-billkey를 사용하세요.
 *
 * 레거시 rebillRegist 방식은 billKey 방식(register-billkey + billPay Cron)으로 대체됨.
 * 기존 active 구독자는 PayApp 자동결제 유지 (영향 없음).
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "이 엔드포인트는 더 이상 사용되지 않습니다. /api/payments/payapp/register-billkey를 사용하세요.",
      deprecated: true,
    },
    { status: 410 }
  );
}
