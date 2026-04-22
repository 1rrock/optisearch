import { describe, expect, it } from "vitest";

import { POST } from "../../src/app/api/payments/payapp/activate-from-return/route";

describe("activate-from-return route", () => {
  it("is permanently disabled for commercial safety", async () => {
    const response = await POST();
    const payload = await response.json();

    expect(response.status).toBe(410);
    expect(payload.disabled).toBe(true);
  });
});
