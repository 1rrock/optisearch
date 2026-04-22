import { getKstDateString } from "@/shared/lib/payapp-time";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MIN_REFUND_AMOUNT = 1000;

export interface RefundableChargeRow {
  mul_no: string;
  amount: number;
  purpose: string | null;
  paid_at: string | null;
  provider_paid_at: string | null;
  refunded_at: string | null;
  refund_amount: number | null;
}

export interface ProratedRefundLine {
  mulNo: string;
  purpose: string;
  originalAmount: number;
  refundableBaseAmount: number;
  refundAmount: number;
  paidAt: string;
}

export interface ProratedRefundBreakdown {
  remainingDays: number;
  cycleStartDate: string;
  cycleEndDate: string;
  totalRefundAmount: number;
  lines: ProratedRefundLine[];
}

function kstDateToMillis(dateOnly: string): number {
  return new Date(`${dateOnly}T00:00:00+09:00`).getTime();
}

function shiftKstDate(dateOnly: string, days: number): string {
  const date = new Date(`${dateOnly}T00:00:00+09:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getProrationWindow(currentPeriodEnd: string, now: Date | string | null = null) {
  const todayKst = getKstDateString(now);
  const remainingDays = Math.max(
    0,
    Math.ceil((kstDateToMillis(currentPeriodEnd) - kstDateToMillis(todayKst)) / MS_PER_DAY)
  );

  return {
    todayKst,
    remainingDays,
    cycleStartDate: shiftKstDate(currentPeriodEnd, -30),
    cycleEndDate: currentPeriodEnd,
  };
}

export function buildProratedRefundBreakdown(
  charges: RefundableChargeRow[],
  currentPeriodEnd: string,
  now: Date | string | null = null
): ProratedRefundBreakdown {
  const { remainingDays, cycleStartDate, cycleEndDate } = getProrationWindow(currentPeriodEnd, now);

  if (remainingDays === 0) {
    return {
      remainingDays,
      cycleStartDate,
      cycleEndDate,
      totalRefundAmount: 0,
      lines: [],
    };
  }

  const lines = charges
    .filter((charge) => !charge.refunded_at)
    .flatMap<ProratedRefundLine>((charge) => {
      const paidAt = charge.provider_paid_at ?? charge.paid_at;
      if (!paidAt) return [];

      const paidDate = paidAt.slice(0, 10);
      if (paidDate < cycleStartDate || paidDate > cycleEndDate) {
        return [];
      }

      const refundableBaseAmount = Math.max(0, charge.amount - (charge.refund_amount ?? 0));
      if (refundableBaseAmount === 0) return [];

      const refundAmount = Math.floor((refundableBaseAmount * remainingDays) / 30);
      if (refundAmount === 0) return [];

      return [{
        mulNo: charge.mul_no,
        purpose: charge.purpose ?? "subscription",
        originalAmount: charge.amount,
        refundableBaseAmount,
        refundAmount,
        paidAt,
      }];
    });

  const totalRefundAmount = lines.reduce((sum, line) => sum + line.refundAmount, 0);

  if (totalRefundAmount < MIN_REFUND_AMOUNT) {
    return {
      remainingDays,
      cycleStartDate,
      cycleEndDate,
      totalRefundAmount: 0,
      lines: [],
    };
  }

  return {
    remainingDays,
    cycleStartDate,
    cycleEndDate,
    totalRefundAmount,
    lines,
  };
}
