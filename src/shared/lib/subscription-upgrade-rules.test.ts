import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calcProRatedDiff,
  isGracePeriodEligible,
  resolveUpgradeBillingDate,
} from "@/shared/lib/subscription-upgrade-rules";

describe("subscription upgrade rules", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("treats pending_cancel/stopped rows with current_period_end on or after today as grace eligible", () => {
    expect(isGracePeriodEligible("pending_cancel", "2026-04-23", "2026-04-23")).toBe(true);
    expect(isGracePeriodEligible("stopped", "2026-04-24", "2026-04-23")).toBe(true);
  });

  it("does not broaden grace eligibility to other statuses or expired periods", () => {
    expect(isGracePeriodEligible("active", "2026-04-24", "2026-04-23")).toBe(false);
    expect(isGracePeriodEligible("stopped", "2026-04-22", "2026-04-23")).toBe(false);
    expect(isGracePeriodEligible("pending_cancel", null, "2026-04-23")).toBe(false);
  });

  it("uses current_period_end for grace upgrades and next_billing_date for active upgrades", () => {
    expect(resolveUpgradeBillingDate("stopped", "2026-04-30", null, "2026-04-23")).toBe("2026-04-30");
    expect(resolveUpgradeBillingDate("active", "2026-04-30", "2026-05-10", "2026-04-23")).toBe("2026-05-10");
  });

  it("calculates a full diff for a full remaining month and zero on the billing date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-23T00:00:00+09:00"));

    expect(calcProRatedDiff(15000, "2026-05-23")).toBe(15000);
    expect(calcProRatedDiff(15000, "2026-04-23")).toBe(0);
  });

  it("accepts ISO datetime strings without producing NaN", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-23T00:00:00+09:00"));

    expect(calcProRatedDiff(20000, "2026-05-19T00:00:00+09:00")).toBe(17334);
  });
});
