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

import { GET } from "../../src/app/api/subscription/route";

describe("subscription route", () => {
  beforeEach(() => {
    mocks.getAuthenticatedUser.mockReset();
    mocks.createServerClient.mockReset();
    mocks.getAuthenticatedUser.mockResolvedValue({ userId: "user-1", plan: "basic" });
  });

  it("returns next billing metadata for pending_billing subscriptions", async () => {
    const supabase = createMockSupabase({
      tables: {
        subscriptions: {
          select: {
            data: {
              plan: "basic",
              status: "pending_billing",
              current_period_end: null,
              next_billing_date: "2026-05-19",
              pending_action: null,
              pending_plan: null,
              pending_start_date: null,
              failed_charge_count: 0,
            },
            error: null,
          },
        },
      },
    });

    mocks.createServerClient.mockResolvedValue(supabase);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      plan: "basic",
      status: "pending_billing",
      currentPeriodEnd: null,
      nextBillingDate: "2026-05-19",
    });
  });
});
