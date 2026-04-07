import { createHash } from "crypto";
import type { PlanId } from "@/shared/config/constants";

export const NICEPAY_CONFIG = {
  get clientId() {
    return process.env.NEXT_PUBLIC_NICEPAY_CLIENT_ID ?? "";
  },
  get secretKey() {
    return process.env.NICEPAY_SECRET_KEY ?? "";
  },
  get baseUrl() {
    return process.env.NICEPAY_ENV === "production"
      ? "https://api.nicepay.co.kr"
      : "https://sandbox-api.nicepay.co.kr";
  },
};

/** 플랜별 결제 금액 (KRW) — 금액 변조 방지용 서버 검증 */
export const PLAN_AMOUNT_MAP: Record<string, number> = {
  basic: 9900,
  pro: 29000,
};

/** Basic auth 헤더 생성 */
export function getBasicAuthHeader(): string {
  const credentials = Buffer.from(
    `${NICEPAY_CONFIG.clientId}:${NICEPAY_CONFIG.secretKey}`
  ).toString("base64");
  return `Basic ${credentials}`;
}

/**
 * returnUrl 서명 검증
 * formula: hex(sha256(authToken + clientId + amount + SecretKey))
 */
export function verifyReturnSignature(
  authToken: string,
  clientId: string,
  amount: string,
  signature: string
): boolean {
  const computed = createHash("sha256")
    .update(authToken + clientId + amount + NICEPAY_CONFIG.secretKey)
    .digest("hex");
  return computed === signature;
}

/**
 * orderId 파싱: "optisearch_{planId}_{userId}_{timestamp}"
 */
export function parseOrderId(orderId: string): {
  planId: PlanId;
  userId: string;
  timestamp: string;
} | null {
  const parts = orderId.split("_");
  if (parts.length < 4 || parts[0] !== "optisearch") return null;

  const planId = parts[1] as PlanId;
  if (planId !== "basic" && planId !== "pro") return null;

  // userId may contain underscores, so rejoin everything between planId and last part (timestamp)
  const timestamp = parts[parts.length - 1];
  const userId = parts.slice(2, parts.length - 1).join("_");

  return { planId, userId, timestamp };
}
