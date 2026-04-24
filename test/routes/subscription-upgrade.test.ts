import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockSupabase } from "../helpers/mock-supabase";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  createServerClient: vi.fn(),
  billPay: vi.fn(),
}));

vi.mock("@/shared/lib/api-helpers", () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));

vi.mock("@/shared/lib/supabase", () => ({
  createServerClient: mocks.createServerClient,
}));

vi.mock("@/shared/lib/payapp", async () => {
  const actual = await vi.importActual<typeof import("@/shared/lib/payapp")>("@/shared/lib/payapp");
  return {
    ...actual,
    billPay: mocks.billPay,
  };
});

import { POST } from "../../src/app/api/subscription/upgrade/route";
import { PayAppTimeoutError } from "../../src/shared/lib/payapp";

describe("subscription upgrade route", () => {
  beforeEach(() => {
    mocks.getAuthenticatedUser.mockReset();
    mocks.createServerClient.mockReset();
    mocks.billPay.mockReset();
    mocks.getAuthenticatedUser.mockResolvedValue({ userId: "user-1", plan: "basic" });
    process.env.PAYAPP_DEFAULT_RECVPHONE = "01000000000";
    process.env.PAYAPP_FEEDBACK_URL = "https://example.com/api/payments/payapp/webhook";
  });

  it("blocks automatic retry when upgrade billPay times out", async () => {
    const supabase = createMockSupabase({
      tables: {
        subscriptions: {
          select: { data: { id: "sub-1", status: "active", bill_key: "bill-1", rebill_no: null, pending_action: null, current_period_end: "2026-05-01", next_billing_date: "2026-05-01" }, error: null },
        },
        payment_attempts: {
          insert: { data: null, error: null },
          update: { data: null, error: null },
        },
      },
    });
    mocks.createServerClient.mockResolvedValue(supabase);
    mocks.billPay.mockRejectedValue(new PayAppTimeoutError());

    const response = await POST();
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toContain("결제 상태 확인이 필요합니다");
    expect(supabase.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "payment_attempts",
          operation: "update",
          payload: expect.objectContaining({ status: "provider_unknown" }),
        }),
      ])
    );
  });

  it("allows grace-period basic users to upgrade immediately using current_period_end for proration", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-23T09:00:00+09:00"));

    const supabase = createMockSupabase({
      tables: {
        subscriptions: {
          select: {
            data: {
              id: "sub-1",
              status: "pending_cancel",
              bill_key: "bill-1",
              rebill_no: null,
              pending_action: null,
              current_period_end: "2026-05-19",
              next_billing_date: null,
            },
            error: null,
          },
        },
        payment_attempts: {
          insert: { data: null, error: null },
          update: { data: null, error: null },
        },
      },
    });
    mocks.createServerClient.mockResolvedValue(supabase);
    mocks.billPay.mockResolvedValue({
      state: 1,
      mulNo: "mul-upgrade-1",
      raw: { state: "1", mul_no: "mul-upgrade-1" },
    });

    const response = await POST();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      method: "billpay_instant",
      mulNo: "mul-upgrade-1",
      proRatedAmount: 17334,
    });
    expect(mocks.billPay).toHaveBeenCalledWith(
      expect.objectContaining({
        billKey: "bill-1",
        var1: "user-1:pro",
        var2: "upgrade_diff",
        price: 17334,
      })
    );

    vi.useRealTimers();
  });

  it("still upgrades when payment_attempts is missing from the schema cache", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-23T09:00:00+09:00"));

    const supabase = createMockSupabase({
      tables: {
        subscriptions: {
          select: {
            data: {
              id: "sub-1",
              status: "pending_cancel",
              bill_key: "bill-1",
              rebill_no: null,
              pending_action: null,
              current_period_end: "2026-05-19",
              next_billing_date: null,
            },
            error: null,
          },
        },
        payment_attempts: {
          insert: { data: null, error: { message: "Could not find the table 'public.payment_attempts' in the schema cache" } },
        },
      },
    });
    mocks.createServerClient.mockResolvedValue(supabase);
    mocks.billPay.mockResolvedValue({
      state: 1,
      mulNo: "mul-upgrade-2",
      raw: { state: "1", mul_no: "mul-upgrade-2" },
    });

    const response = await POST();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ ok: true, method: "billpay_instant", mulNo: "mul-upgrade-2" });

    vi.useRealTimers();
  });
});
