/**
 * PortOne V2 server-side helper.
 * Uses the API Secret for server-to-server calls (billing, refunds, etc.)
 *
 * Authentication: `Authorization: PortOne {API_SECRET}` (no token exchange needed)
 * Docs: https://developers.portone.io/api/rest-v2/
 */

const PORTONE_API_BASE = "https://api.portone.io";

function getApiSecret(): string {
  const secret = process.env.PORTONE_API_SECRET;
  if (!secret) {
    throw new Error("Missing PORTONE_API_SECRET environment variable");
  }
  return secret;
}

async function portoneRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${PORTONE_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `PortOne ${getApiSecret()}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(
      `PortOne API error: ${(error as Record<string, string>).message ?? res.statusText}`
    );
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Billing Key (정기결제)
// ---------------------------------------------------------------------------

export interface BillingKeyInfo {
  billingKey: string;
  status: string;
  methods?: Array<{ card?: { issuerName?: string; number?: string } }>;
}

/**
 * Get billing key info.
 */
export async function getBillingKeyInfo(
  billingKey: string
): Promise<BillingKeyInfo> {
  return portoneRequest<BillingKeyInfo>(`/billing-keys/${billingKey}`);
}

/**
 * Delete (revoke) a billing key.
 */
export async function deleteBillingKey(billingKey: string): Promise<void> {
  await portoneRequest(`/billing-keys/${billingKey}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export interface PaymentResult {
  payment: {
    id: string;
    status: string;
    paidAt?: string;
    amount: { total: number };
    pgTxId?: string;
  };
}

/**
 * Charge using a billing key (정기결제 실행).
 * POST /payments/{paymentId}/billing-key
 */
export async function chargeByBillingKey(params: {
  billingKey: string;
  paymentId: string;
  amount: number;
  orderName: string;
  customerId: string;
  customerEmail?: string;
}): Promise<PaymentResult> {
  return portoneRequest<PaymentResult>(
    `/payments/${encodeURIComponent(params.paymentId)}/billing-key`,
    {
      method: "POST",
      body: JSON.stringify({
        billingKey: params.billingKey,
        orderName: params.orderName,
        customer: {
          id: params.customerId,
          ...(params.customerEmail ? { email: params.customerEmail } : {}),
        },
        amount: { total: params.amount },
        currency: "KRW",
      }),
    }
  );
}

/**
 * Get payment status.
 */
export async function getPayment(
  paymentId: string
): Promise<{ id: string; status: string; paidAt?: string }> {
  return portoneRequest(`/payments/${encodeURIComponent(paymentId)}`);
}
