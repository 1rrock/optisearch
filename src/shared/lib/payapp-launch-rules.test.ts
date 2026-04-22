import { describe, expect, it } from "vitest";
import { PayAppTimeoutError } from "@/shared/lib/payapp";
import {
  buildPaymentAttemptKey,
  pickFirstSubscriptionPaymentMulNo,
  requiresRemoteCleanupReview,
  resolveAttemptFailureStatus,
  shouldDispatchFirstCharge,
} from "@/shared/lib/payapp-launch-rules";

describe("payapp launch rules", () => {
  it("dispatches first signup charge only when billing is due", () => {
    expect(shouldDispatchFirstCharge("2026-04-22", "2026-04-22")).toBe(true);
    expect(shouldDispatchFirstCharge("2026-04-23", "2026-04-22")).toBe(false);
  });

  it("treats ambiguous billPay timeout as provider_unknown", () => {
    expect(resolveAttemptFailureStatus(new PayAppTimeoutError())).toBe("provider_unknown");
    expect(resolveAttemptFailureStatus(new Error("network failed"))).toBe("manual_review");
  });

  it("queues manual review for billDelete failure recovery", () => {
    expect(requiresRemoteCleanupReview(false)).toBe(true);
    expect(requiresRemoteCleanupReview(true)).toBe(false);
  });

  it("selects only the first subscription charge as the self-service refund target", () => {
    expect(
      pickFirstSubscriptionPaymentMulNo([
        {
          mul_no: "upgrade-1",
          purpose: "upgrade_diff",
          provider_paid_at: "2026-04-20T10:00:00+09:00",
          paid_at: "2026-04-20T10:00:00+09:00",
        },
        {
          mul_no: "sub-1",
          purpose: "subscription",
          provider_paid_at: "2026-04-21T10:00:00+09:00",
          paid_at: "2026-04-21T10:00:00+09:00",
        },
        {
          mul_no: "sub-2",
          purpose: "subscription",
          provider_paid_at: "2026-05-21T10:00:00+09:00",
          paid_at: "2026-05-21T10:00:00+09:00",
        },
      ])
    ).toBe("sub-1");
  });

  it("uses deterministic attempt keys to gate concurrent registration/request races", () => {
    expect(buildPaymentAttemptKey("renewal", "sub-1", "2026-04-22")).toBe(
      buildPaymentAttemptKey("renewal", "sub-1", "2026-04-22")
    );
    expect(buildPaymentAttemptKey("renewal", "sub-1", "2026-04-22")).not.toBe(
      buildPaymentAttemptKey("renewal", "sub-1", "2026-04-23")
    );
  });
});
