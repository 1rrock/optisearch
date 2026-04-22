import { describe, expect, it } from "vitest";

import { buildProratedRefundBreakdown } from "@/shared/lib/payapp-refunds";

describe("payapp-refunds", () => {
  it("includes subscription and upgrade_diff payments from the current service window", () => {
    const breakdown = buildProratedRefundBreakdown(
      [
        {
          mul_no: "sub-1",
          amount: 9900,
          purpose: "subscription",
          paid_at: "2026-04-02T09:00:00+09:00",
          provider_paid_at: "2026-04-02T09:00:00+09:00",
          refunded_at: null,
          refund_amount: null,
        },
        {
          mul_no: "upgrade-1",
          amount: 20000,
          purpose: "upgrade_diff",
          paid_at: "2026-04-10T10:00:00+09:00",
          provider_paid_at: "2026-04-10T10:00:00+09:00",
          refunded_at: null,
          refund_amount: null,
        },
        {
          mul_no: "old-1",
          amount: 9900,
          purpose: "subscription",
          paid_at: "2026-02-15T09:00:00+09:00",
          provider_paid_at: "2026-02-15T09:00:00+09:00",
          refunded_at: null,
          refund_amount: null,
        },
      ],
      "2026-05-01",
      "2026-04-16T12:00:00+09:00"
    );

    expect(breakdown.remainingDays).toBe(15);
    expect(breakdown.lines.map((line) => line.mulNo)).toEqual(["sub-1", "upgrade-1"]);
    expect(breakdown.totalRefundAmount).toBe(14950);
  });

  it("drops refunds when the total prorated amount is below the minimum threshold", () => {
    const breakdown = buildProratedRefundBreakdown(
      [
        {
          mul_no: "sub-1",
          amount: 1500,
          purpose: "subscription",
          paid_at: "2026-04-25T09:00:00+09:00",
          provider_paid_at: "2026-04-25T09:00:00+09:00",
          refunded_at: null,
          refund_amount: null,
        },
      ],
      "2026-05-01",
      "2026-04-30T10:00:00+09:00"
    );

    expect(breakdown.totalRefundAmount).toBe(0);
    expect(breakdown.lines).toEqual([]);
  });
});
