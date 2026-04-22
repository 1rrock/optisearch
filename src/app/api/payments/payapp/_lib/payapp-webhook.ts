import { parsePayAppDateTime } from "@/shared/lib/payapp-time";

export { addDaysToKstDate } from "@/shared/lib/payapp-time";

export interface PayAppWebhookPayload {
  raw: Record<string, string>;
  mulNo: string | null;
  linkval: string | null;
  payState: number;
  purpose: string;
  var1: string;
  userId: string;
  planFromVar1: string | null;
  rebillNo: string | null;
  billKey: string | null;
  price: number;
  payType: string | null;
  receiptUrl: string | null;
  payDateIso: string | null;
  cancelDateIso: string | null;
}

export function parsePayAppWebhook(formText: string): PayAppWebhookPayload {
  const params = new URLSearchParams(formText);
  const raw = Object.fromEntries(params.entries());
  const var1 = params.get("var1") ?? "";
  const purpose = params.get("var2") ?? "subscription";
  const colonIndex = var1.indexOf(":");
  const userId = colonIndex > 0 ? var1.slice(0, colonIndex) : var1;
  const planFromVar1 = colonIndex > 0 ? var1.slice(colonIndex + 1) : null;

  return {
    raw,
    mulNo: params.get("mul_no"),
    linkval: params.get("linkval"),
    payState: Number(params.get("pay_state") ?? "0"),
    purpose,
    var1,
    userId,
    planFromVar1,
    rebillNo: params.get("rebill_no"),
    billKey: params.get("encBill"),
    price: Number(params.get("price") ?? "0"),
    payType: params.get("pay_type"),
    receiptUrl: params.get("receipt_url"),
    payDateIso: parsePayAppDateTime(params.get("pay_date")),
    cancelDateIso: parsePayAppDateTime(params.get("canceldate")),
  };
}

export function buildWebhookKeys(payload: Pick<PayAppWebhookPayload, "mulNo" | "payState" | "purpose" | "userId" | "rebillNo" | "payDateIso" | "cancelDateIso">): {
  eventKey: string;
  lifecycleKey: string;
} {
  const lifecycleBase =
    payload.mulNo ??
    [payload.userId || "unknown-user", payload.purpose || "unknown-purpose", payload.rebillNo || "no-rebill"].join(":");
  const timeKey = payload.cancelDateIso ?? payload.payDateIso ?? "no-provider-time";

  return {
    lifecycleKey: [lifecycleBase, payload.purpose || "unknown-purpose"].join(":"),
    eventKey: [lifecycleBase, String(payload.payState), payload.purpose || "unknown-purpose", timeKey].join(":"),
  };
}
