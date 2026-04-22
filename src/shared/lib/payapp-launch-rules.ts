import { isPayAppTimeoutError } from "@/shared/lib/payapp";

export function buildPaymentAttemptKey(kind: string, targetId: string, reference: string): string {
  return `${kind}:${targetId}:${reference}`;
}

export function shouldDispatchFirstCharge(
  nextBillingDate: string | null | undefined,
  todayKst: string
): boolean {
  return !nextBillingDate || nextBillingDate <= todayKst;
}

export function resolveAttemptFailureStatus(error: unknown): "provider_unknown" | "manual_review" {
  return isPayAppTimeoutError(error) ? "provider_unknown" : "manual_review";
}

export function requiresRemoteCleanupReview(cleanupOk: boolean): boolean {
  return !cleanupOk;
}

export interface SubscriptionPaymentLike {
  mul_no: string;
  purpose: string | null;
  provider_paid_at: string | null;
  paid_at: string | null;
}

export function pickFirstSubscriptionPaymentMulNo(
  payments: SubscriptionPaymentLike[]
): string | null {
  return [...payments]
    .filter((payment) => payment.purpose === "subscription" && (payment.provider_paid_at ?? payment.paid_at))
    .sort((left, right) => {
      const leftTime = new Date(left.provider_paid_at ?? left.paid_at ?? 0).getTime();
      const rightTime = new Date(right.provider_paid_at ?? right.paid_at ?? 0).getTime();
      return leftTime - rightTime;
    })[0]?.mul_no ?? null;
}
