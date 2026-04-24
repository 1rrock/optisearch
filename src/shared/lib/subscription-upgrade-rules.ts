const GRACE_PERIOD_STATUSES = new Set(["pending_cancel", "stopped"]);

function normalizeBillingDate(value: string | null | undefined): string | null {
  if (!value) return null;

  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match?.[1] ?? null;
}

export function isGracePeriodEligible(
  status: string | null | undefined,
  currentPeriodEnd: string | null | undefined,
  todayKst: string
): boolean {
  return !!status && !!currentPeriodEnd && GRACE_PERIOD_STATUSES.has(status) && currentPeriodEnd >= todayKst;
}

export function resolveUpgradeBillingDate(
  status: string | null | undefined,
  currentPeriodEnd: string | null | undefined,
  nextBillingDate: string | null | undefined,
  todayKst: string
): string | null {
  if (isGracePeriodEligible(status, currentPeriodEnd, todayKst)) {
    return currentPeriodEnd ?? null;
  }

  return nextBillingDate ?? null;
}

/** 남은 기간 비례 업그레이드 차액 계산 (KST, 30일 기준, 올림) */
export function calcProRatedDiff(fullDiff: number, nextBillingDate: string | null): number {
  if (!nextBillingDate) return fullDiff;

  const normalizedBillingDate = normalizeBillingDate(nextBillingDate);
  if (!normalizedBillingDate) return fullDiff;

  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const todayKST = new Date(Date.now() + KST_OFFSET_MS);
  const nextDate = new Date(normalizedBillingDate + "T00:00:00+09:00");

  if (Number.isNaN(nextDate.getTime())) {
    return fullDiff;
  }

  const remainingMs = nextDate.getTime() - todayKST.getTime();
  const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

  if (remainingDays === 0) return 0;

  return Math.ceil((fullDiff * remainingDays) / 30);
}
