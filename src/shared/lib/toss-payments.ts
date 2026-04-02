/**
 * Toss Payments server-side helper.
 * Uses the Secret Key for server-to-server API calls (billing, refunds, etc.)
 */

const TOSS_API_BASE = "https://api.tosspayments.com/v1";

function getAuthHeader(): string {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing TOSS_SECRET_KEY environment variable");
  }
  // Toss uses Basic auth with secretKey as username, empty password
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

async function tossRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${TOSS_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(`Toss API error: ${error.message ?? res.statusText}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Charge a billing key (정기결제 실행).
 */
export async function chargeBillingKey(params: {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
}): Promise<any> {
  return tossRequest(`/billing/${params.billingKey}`, {
    method: "POST",
    body: JSON.stringify({
      customerKey: params.customerKey,
      amount: params.amount,
      orderId: params.orderId,
      orderName: params.orderName,
    }),
  });
}

/**
 * Get billing key info.
 */
export async function getBillingKeyInfo(billingKey: string): Promise<any> {
  return tossRequest(`/billing/authorizations/${billingKey}`);
}
