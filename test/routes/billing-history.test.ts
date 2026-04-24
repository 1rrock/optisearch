import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockSupabase } from "../helpers/mock-supabase";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  createServerClient: vi.fn(),
}));

vi.mock("@/shared/lib/api-helpers", () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));

vi.mock("@/shared/lib/supabase", () => ({
  createServerClient: mocks.createServerClient,
}));

import { GET } from "../../src/app/api/billing/history/route";

describe("billing history route", () => {
  beforeEach(() => {
    mocks.getAuthenticatedUser.mockReset();
    mocks.createServerClient.mockReset();
    mocks.getAuthenticatedUser.mockResolvedValue({ userId: "user-1", plan: "basic" });
  });

  it("falls back when provider_paid_at is missing from the live schema", async () => {
    const supabase = createMockSupabase({
      tables: {
        payment_history: {
          select: (context) => {
            if (context.selectColumns?.includes("provider_paid_at")) {
              return {
                data: null,
                error: { message: "column payment_history.provider_paid_at does not exist" },
              };
            }

            return {
              data: [
                {
                  id: "pay-1",
                  mul_no: "mul-1",
                  amount: 9900,
                  vat: 900,
                  purpose: "subscription",
                  paid_at: "2026-04-23T10:00:00+09:00",
                  refunded_at: null,
                  receipt_url: null,
                },
              ],
              error: null,
            };
          },
        },
      },
    });

    mocks.createServerClient.mockResolvedValue(supabase);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.items[0]).toMatchObject({
      mulNo: "mul-1",
      providerPaidAt: null,
    });
  });
});
