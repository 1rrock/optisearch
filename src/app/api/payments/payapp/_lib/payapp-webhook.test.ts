import { describe, expect, it } from "vitest";
import { buildWebhookKeys, parsePayAppWebhook } from "./payapp-webhook";

describe("payapp webhook keying", () => {
  it("treats duplicate webhook delivery as the same event", () => {
    const payload = parsePayAppWebhook(
      "mul_no=1001&pay_state=4&var1=user-1%3Abasic&var2=subscription&pay_date=2026-04-22+09%3A10%3A00"
    );

    const first = buildWebhookKeys(payload);
    const second = buildWebhookKeys(payload);

    expect(first).toEqual(second);
  });

  it("keeps success then cancel/refund ordering on one lifecycle while allowing different events", () => {
    const success = parsePayAppWebhook(
      "mul_no=1001&pay_state=4&var1=user-1%3Abasic&var2=subscription&pay_date=2026-04-22+09%3A10%3A00"
    );
    const cancel = parsePayAppWebhook(
      "mul_no=1001&pay_state=9&var1=user-1%3Abasic&var2=subscription&canceldate=2026-04-23+10%3A00%3A00"
    );

    const successKeys = buildWebhookKeys(success);
    const cancelKeys = buildWebhookKeys(cancel);

    expect(successKeys.lifecycleKey).toBe(cancelKeys.lifecycleKey);
    expect(successKeys.eventKey).not.toBe(cancelKeys.eventKey);
  });
});
