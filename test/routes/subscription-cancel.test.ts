import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockSupabase } from "../helpers/mock-supabase";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  createServerClient: vi.fn(),
  deleteBillKey: vi.fn(),
  cancelRebill: vi.fn(),
  cancelPayment: vi.fn(),
  isPayAppTimeoutError: vi.fn(),
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
    deleteBillKey: mocks.deleteBillKey,
    cancelRebill: mocks.cancelRebill,
    cancelPayment: mocks.cancelPayment,
    isPayAppTimeoutError: mocks.isPayAppTimeoutError,
  };
});

import { POST } from "../../src/app/api/subscription/cancel/route";

describe("subscription cancel route", () => {
  beforeEach(() => {
    mocks.getAuthenticatedUser.mockReset();
    mocks.createServerClient.mockReset();
    mocks.deleteBillKey.mockReset();
    mocks.cancelRebill.mockReset();
    mocks.cancelPayment.mockReset();
    mocks.isPayAppTimeoutError.mockReset();
    mocks.getAuthenticatedUser.mockResolvedValue({ userId: "user-1", plan: "pro" });
    mocks.cancelRebill.mockResolvedValue({ state: 1, raw: {} });
    mocks.cancelPayment.mockResolvedValue({ state: 1, raw: {} });
    mocks.isPayAppTimeoutError.mockReturnValue(false);
  });

  it("queues manual review when billDelete fails during pending_billing cancellation", async () => {
    const supabase = createMockSupabase({
      tables: {
        subscriptions: {
          select: { data: { id: "sub-1", bill_key: "bill-1", rebill_no: null, status: "pending_billing", current_period_end: "2026-05-01" }, error: null },
          update: { data: null, error: null },
        },
        payment_attempts: {
          insert: { data: null, error: null },
        },
      },
    });
    mocks.createServerClient.mockResolvedValue(supabase);
    mocks.deleteBillKey.mockResolvedValue({ state: 0, errorMessage: "billDelete failed", raw: {} });

    const response = await POST();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.manualReview).toBe(true);
    expect(supabase.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ table: "payment_attempts", operation: "insert" }),
      ])
    );
  });

  it("treats pending_billing cancellation as payment-progress cancel while preserving current entitlement", async () => {
    const supabase = createMockSupabase({
      tables: {
        subscriptions: {
          select: { data: { id: "sub-1", bill_key: null, rebill_no: null, status: "pending_billing", current_period_end: "2099-05-23" }, error: null },
          update: { data: null, error: null },
        },
      },
    });
    mocks.createServerClient.mockResolvedValue(supabase);

    const response = await POST();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      usableUntil: "2099-05-23",
    });
    expect(String(payload.message)).toContain("진행 중인 결제가 취소되었습니다");
    expect(supabase.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "subscriptions",
          operation: "update",
          payload: expect.objectContaining({
            status: "pending_cancel",
            current_period_end: "2099-05-23",
            next_billing_date: null,
          }),
        }),
      ])
    );
  });

  it("does not return success when pending_billing subscription update fails", async () => {
    const supabase = createMockSupabase({
      tables: {
        subscriptions: {
          select: { data: { id: "sub-1", bill_key: null, rebill_no: null, status: "pending_billing", current_period_end: null }, error: null },
          update: { data: null, error: { message: "update failed" } },
        },
      },
    });
    mocks.createServerClient.mockResolvedValue(supabase);

    const response = await POST();
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe("update failed");
  });
});
