import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-23T00:00:00+09:00"));
    mocks.createServerClient.mockReset();
    mocks.verifyWebhookLinkVal.mockReset();
    mocks.billPay.mockReset();
    mocks.verifyWebhookLinkVal.mockReturnValue(true);
    process.env.PAYAPP_DEFAULT_RECVPHONE = "01000000000";
    process.env.PAYAPP_FEEDBACK_URL = "https://example.com/api/payments/payapp/webhook";
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it("activates deferred same-plan continuation after grace-period billkey registration without charging yet", async () => {
    const supabase = createMockSupabase({
      tables: {
        webhook_events: {
          insert: { data: { id: "evt-1", processing_status: "received" }, error: null },
          update: { data: null, error: null },
        },
        subscriptions: {
          update: (context) => {
            if (context.payload && typeof context.payload === "object" && "bill_key" in (context.payload as Record<string, unknown>)) {
              return {
                data: {
                  id: "sub-1",
                  plan: "basic",
                  pending_action: null,
                  pending_plan: null,
                  next_billing_date: "2026-05-19",
                  current_period_end: "2026-05-19",
                },
                error: null,
              };
            }

            return { data: null, error: null };
          },
        },
      },
    });
    mocks.createServerClient.mockResolvedValue(supabase);

    const response = await POST(
      new Request("https://example.com/api/payments/payapp/webhook", {
        method: "POST",
        body: "linkval=signed&pay_state=4&var1=user-1%3Abasic&var2=billkey_registration&encBill=bill-1&pay_date=2026-04-23+09%3A10%3A00",
      })
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("SUCCESS");
    expect(mocks.billPay).not.toHaveBeenCalled();
    expect(supabase.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "subscriptions",
          operation: "update",
          payload: expect.objectContaining({
            status: "active",
          }),
        }),
      ])
    );
  });

  it("dispatches an immediate upgrade_diff charge after grace basic-to-pro billkey registration", async () => {
    const supabase = createMockSupabase({
      tables: {
        webhook_events: {
          insert: { data: { id: "evt-1", processing_status: "received" }, error: null },
          update: { data: null, error: null },
        },
        subscriptions: {
          update: () => ({
            data: {
              id: "sub-1",
              plan: "basic",
              pending_action: "upgrade",
              pending_plan: "pro",
              next_billing_date: "2026-05-19",
              current_period_end: "2026-05-19",
            },
            error: null,
          }),
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

    const response = await POST(
      new Request("https://example.com/api/payments/payapp/webhook", {
        method: "POST",
        body: "linkval=signed&pay_state=4&var1=user-1%3Apro&var2=billkey_registration&encBill=bill-1&pay_date=2026-04-23+09%3A10%3A00",
      })
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("SUCCESS");
    expect(mocks.billPay).toHaveBeenCalledWith(
      expect.objectContaining({
        billKey: "bill-1",
        var1: "user-1:pro",
        var2: "upgrade_diff",
        price: 17334,
      })
    );
  });

  it("falls back to legacy payment_history columns when provider fields are missing", async () => {
    const supabase = createMockSupabase({
      tables: {
        webhook_events: {
          insert: { data: { id: "evt-1", processing_status: "received" }, error: null },
          update: { data: null, error: null },
        },
        subscriptions: {
          select: {
            data: {
              id: "sub-1",
              status: "active",
              plan: "basic",
              pending_action: null,
              pending_plan: null,
              bill_key: "bill-1",
              rebill_no: null,
              failed_charge_count: 0,
              next_billing_date: "2026-05-23",
              current_period_end: "2026-05-23",
            },
            error: null,
          },
          update: { data: null, error: null },
        },
        payment_attempts: {
          update: { data: null, error: null },
        },
        payment_history: {
          select: (context) => {
            if (context.selectColumns?.includes("refund_amount")) {
              return {
                data: null,
                error: { message: "column payment_history.refund_amount does not exist" },
              };
            }

            return { data: null, error: null };
          },
          upsert: (context) => {
            const payload = (context.payload ?? {}) as Record<string, unknown>;
            if ("provider_paid_at" in payload || "refund_amount" in payload || "payapp_event_key" in payload) {
              return {
                data: null,
                error: { message: "column payment_history.provider_paid_at does not exist" },
              };
            }

            return { data: null, error: null };
          },
        },
      },
    });
    mocks.createServerClient.mockResolvedValue(supabase);

    const response = await POST(
      new Request("https://example.com/api/payments/payapp/webhook", {
        method: "POST",
        body: "linkval=signed&mul_no=mul-2&pay_state=4&var1=user-1%3Abasic&var2=subscription&pay_date=2026-04-23+09%3A10%3A00",
      })
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("SUCCESS");
    expect(supabase.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "payment_history",
          operation: "upsert",
          payload: expect.not.objectContaining({
            provider_paid_at: expect.anything(),
          }),
        }),
      ])
    );
  });

  it("still dispatches the first charge when payment_attempts is missing from the schema cache", async () => {
    const supabase = createMockSupabase({
      tables: {
        webhook_events: {
          insert: { data: { id: "evt-1", processing_status: "received" }, error: null },
          update: { data: null, error: null },
        },
        subscriptions: {
          update: () => ({
            data: { id: "sub-1", plan: "basic", next_billing_date: "2026-04-22", current_period_end: null },
            error: null,
          }),
          select: {
            data: {
              id: "sub-1",
              status: "pending_billing",
              plan: "basic",
              pending_action: null,
              pending_plan: null,
              bill_key: "bill-1",
              rebill_no: null,
              failed_charge_count: 0,
              next_billing_date: "2026-04-22",
              current_period_end: null,
            },
            error: null,
          },
        },
        payment_attempts: {
          insert: { data: null, error: { message: "Could not find the table 'public.payment_attempts' in the schema cache" } },
          update: { data: null, error: { message: "Could not find the table 'public.payment_attempts' in the schema cache" } },
          select: { data: null, error: { message: "Could not find the table 'public.payment_attempts' in the schema cache" } },
        },
      },
    });
    mocks.createServerClient.mockResolvedValue(supabase);
    mocks.billPay.mockResolvedValue({
      state: 1,
      mulNo: "mul-compat-1",
      raw: { state: "1", mul_no: "mul-compat-1" },
    });

    const response = await POST(
      new Request("https://example.com/api/payments/payapp/webhook", {
        method: "POST",
        body: "linkval=signed&pay_state=4&var1=user-1%3Abasic&var2=billkey_registration&encBill=bill-1&pay_date=2026-04-22+09%3A10%3A00",
      })
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("SUCCESS");
    expect(mocks.billPay).toHaveBeenCalledWith(
      expect.objectContaining({
        billKey: "bill-1",
        var1: "user-1:basic",
        var2: "subscription",
      })
    );
  });
});
