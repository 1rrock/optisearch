import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { createPayAppApiResponse, createPayAppWebhookFixture, toPayAppFormBody } from "../fixtures/payapp";
import { installMockFetch } from "../helpers/mock-fetch";
import { createMockSupabase } from "../helpers/mock-supabase";

const migrationPath = path.resolve(process.cwd(), "supabase/migrations/20260423_payapp_launch_ready_foundation.sql");

describe("PayApp launch foundation harness", () => {
  it("builds deterministic PayApp webhook fixtures under fake timers", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-22T03:04:05.000Z"));

    const fixture = createPayAppWebhookFixture();
    const body = toPayAppFormBody(fixture);
    const params = new URLSearchParams(body);

    expect(params.get("mul_no")).toBe("mul-0001");
    expect(params.get("pay_state")).toBe("4");
    expect(params.get("var1")).toBe("user-123:pro");
    expect(params.get("pay_date")).toBe("2026-04-22 03:04:05");
  });

  it("mocks provider fetches and preserves queued PayApp responses", async () => {
    const mockFetch = installMockFetch();
    mockFetch.queueTextResponse(createPayAppApiResponse({ rebill_no: "rebill-001" }));

    const response = await fetch("https://api.payapp.kr/oapi/apiLoad.html", {
      method: "POST",
      body: "cmd=billPay",
    });

    expect(await response.text()).toContain("rebill_no=rebill-001");
    expect(mockFetch.calls).toHaveLength(1);
    expect(mockFetch.calls[0]?.init?.method).toBe("POST");

    mockFetch.restore();
  });

  it("supports fluent Supabase mocks for payment routes", async () => {
    const supabase = createMockSupabase({
      tables: {
        webhook_events: {
          insert: () => ({
            data: [{ id: "event-1", processing_status: "received" }],
            error: null,
          }),
        },
      },
      rpc: {
        increment_failed_charge_count: { data: 2, error: null },
      },
    });

    const insertResult = await supabase
      .from<{ id: string; processing_status: string }>("webhook_events")
      .insert({ event_key: "payapp:mul-0001:4:subscription" })
      .select("id, processing_status")
      .maybeSingle();

    const rpcResult = await supabase.rpc<number>("increment_failed_charge_count", {
      p_user_id: "user-123",
    });

    expect(insertResult.data).toEqual({ id: "event-1", processing_status: "received" });
    expect(rpcResult.data).toBe(2);
    expect(supabase.operations).toHaveLength(2);
  });
});

describe("PayApp launch foundation migration", () => {
  const sql = readFileSync(migrationPath, "utf8");

  it("creates the canonical webhook_events table and duplicate tracking function", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.webhook_events");
    expect(sql).toContain("duplicate_count INT NOT NULL DEFAULT 0");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.apply_payapp_webhook_event(");
    expect(sql).toContain("public.payapp_webhook_event_key(");
  });

  it("adds the payment_attempts ledger with planned canonical statuses", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.payment_attempts");
    expect(sql).toContain("'pending'");
    expect(sql).toContain("'requested'");
    expect(sql).toContain("'succeeded'");
    expect(sql).toContain("'failed'");
    expect(sql).toContain("'unknown'");
    expect(sql).toContain("'cancelled'");
  });

  it("adds safe claim functions and open first-charge protection", () => {
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.claim_pending_signup_charge_attempts");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.claim_due_recurring_charge_attempts");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.enforce_single_open_first_charge_attempt()");
    expect(sql).toContain("FOR UPDATE SKIP LOCKED");
  });
});
