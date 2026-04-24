import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMockSupabase } from "../helpers/mock-supabase";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  createServerClient: vi.fn(),
  registerBillKey: vi.fn(),
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
    registerBillKey: mocks.registerBillKey,
  };
});

import { POST } from "../../src/app/api/payments/payapp/register-billkey/route";

describe("register billkey route", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-23T09:00:00+09:00"));
    mocks.getAuthenticatedUser.mockReset();
    mocks.createServerClient.mockReset();
    mocks.registerBillKey.mockReset();
    mocks.getAuthenticatedUser.mockResolvedValue({ userId: "user-1", plan: "basic" });
    mocks.registerBillKey.mockResolvedValue({
      state: 1,
      payurl: "https://pay.example.com/session",
      raw: { state: "1" },
    });
    process.env.PAYAPP_FEEDBACK_URL = "https://example.com/api/payments/payapp/webhook";
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps same-plan grace continuation deferred from current_period_end", async () => {
    const supabase = createMockSupabase({
      tables: {
        subscriptions: {
          select: (context) => {
            const statusFilter = context.filters.find((filter) => filter.type === "in" && filter.column === "status");

            if (statusFilter && statusFilter.type === "in" && statusFilter.values.includes("active")) {
              return { data: null, error: null };
            }

            return {
              data: {
                id: "sub-1",
                status: "pending_cancel",
                current_period_end: "2026-05-19",
                plan: "basic",
              },
              error: null,
            };
          },
          update: { data: null, error: null },
        },
      },
    });

    mocks.createServerClient.mockResolvedValue(supabase);

    const response = await POST(
      new Request("https://example.com/api/payments/payapp/register-billkey", {
        method: "POST",
        headers: { "Content-Type": "application/json", origin: "https://example.com" },
        body: JSON.stringify({ plan: "basic", phone: "01012345678" }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      nextBillingDate: "2026-05-19",
      isDiffUpgrade: false,
      proRatedAmount: 0,
    });
    expect(supabase.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "subscriptions",
          operation: "update",
          payload: expect.objectContaining({
            status: "pending_billing",
            plan: "basic",
            next_billing_date: "2026-05-19",
            pending_action: null,
          }),
        }),
      ])
    );
  });

  it("marks grace basic to pro as an immediate diff upgrade during billkey registration", async () => {
    const supabase = createMockSupabase({
      tables: {
        subscriptions: {
          select: (context) => {
            const statusFilter = context.filters.find((filter) => filter.type === "in" && filter.column === "status");

            if (statusFilter && statusFilter.type === "in" && statusFilter.values.includes("active")) {
              return { data: null, error: null };
            }

            return {
              data: {
                id: "sub-1",
                status: "stopped",
                current_period_end: "2026-05-19",
                plan: "basic",
              },
              error: null,
            };
          },
          update: { data: null, error: null },
        },
      },
    });

    mocks.createServerClient.mockResolvedValue(supabase);

    const response = await POST(
      new Request("https://example.com/api/payments/payapp/register-billkey", {
        method: "POST",
        headers: { "Content-Type": "application/json", origin: "https://example.com" },
        body: JSON.stringify({ plan: "pro", phone: "01012345678" }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      nextBillingDate: "2026-05-19",
      isDiffUpgrade: true,
      proRatedAmount: 17334,
    });
    expect(supabase.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "subscriptions",
          operation: "update",
          payload: expect.objectContaining({
            status: "pending_billing",
            plan: "basic",
            next_billing_date: "2026-05-19",
            pending_action: "upgrade",
            pending_plan: "pro",
          }),
        }),
      ])
    );
  });
});
