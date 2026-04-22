import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockSupabase } from "../helpers/mock-supabase";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  verifyWebhookLinkVal: vi.fn(),
  billPay: vi.fn(),
}));

vi.mock("@/shared/lib/supabase", () => ({
  createServerClient: mocks.createServerClient,
}));

vi.mock("@/shared/lib/payapp", async () => {
  const actual = await vi.importActual<typeof import("@/shared/lib/payapp")>("@/shared/lib/payapp");
  return {
    ...actual,
    verifyWebhookLinkVal: mocks.verifyWebhookLinkVal,
    billPay: mocks.billPay,
  };
});

import { POST } from "../../src/app/api/payments/payapp/webhook/route";

describe("PayApp webhook route", () => {
  beforeEach(() => {
    mocks.createServerClient.mockReset();
    mocks.verifyWebhookLinkVal.mockReset();
    mocks.billPay.mockReset();
    mocks.verifyWebhookLinkVal.mockReturnValue(true);
    process.env.PAYAPP_DEFAULT_RECVPHONE = "01000000000";
    process.env.PAYAPP_FEEDBACK_URL = "https://example.com/api/payments/payapp/webhook";
  });

  it("returns SUCCESS for duplicate webhook delivery without re-dispatching first charge", async () => {
    const supabase = createMockSupabase({
      tables: {
        webhook_events: {
          insert: { data: null, error: { code: "23505", message: "duplicate key" } },
          select: { data: { id: "evt-1", processing_status: "processed" }, error: null },
        },
      },
    });
    mocks.createServerClient.mockResolvedValue(supabase);

    const response = await POST(
      new Request("https://example.com/api/payments/payapp/webhook", {
        method: "POST",
        body: "linkval=signed&mul_no=mul-1&pay_state=4&var1=user-1%3Abasic&var2=subscription&pay_date=2026-04-22+09%3A10%3A00",
      })
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("SUCCESS");
    expect(mocks.billPay).not.toHaveBeenCalled();
  });

  it("creates and dispatches the first charge when billkey registration is due today", async () => {
    const supabase = createMockSupabase({
      tables: {
        webhook_events: {
          insert: { data: { id: "evt-1", processing_status: "received" }, error: null },
          update: { data: null, error: null },
        },
        subscriptions: {
          update: () => ({
            data: { id: "sub-1", plan: "basic", next_billing_date: "2026-04-22" },
            error: null,
          }),
        },
        payment_attempts: {
          insert: { data: { id: "attempt-1", status: "pending" }, error: null },
          update: { data: null, error: null },
        },
      },
    });
    mocks.createServerClient.mockResolvedValue(supabase);
    mocks.billPay.mockResolvedValue({
      state: 1,
      mulNo: "mul-1",
      raw: { state: "1", mul_no: "mul-1" },
    });

    const response = await POST(
      new Request("https://example.com/api/payments/payapp/webhook", {
        method: "POST",
        body: "linkval=signed&pay_state=4&var1=user-1%3Abasic&var2=billkey_registration&encBill=bill-1&pay_date=2026-04-22+09%3A10%3A00",
      })
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("SUCCESS");
    expect(mocks.billPay).toHaveBeenCalledTimes(1);
    expect(mocks.billPay).toHaveBeenCalledWith(
      expect.objectContaining({
        billKey: "bill-1",
        var1: "user-1:basic",
        var2: "subscription",
      })
    );
  });
});
