export interface PayAppWebhookFixture {
  linkval: string;
  mul_no: string;
  pay_state: string;
  var1: string;
  var2: string;
  rebill_no: string;
  encBill: string;
  price: string;
  pay_type: string;
  receipt_url: string;
  pay_date: string;
  canceldate?: string;
}

function formatPayAppDateTime(date: Date): string {
  return date.toISOString().replace("T", " ").slice(0, 19);
}

export function createPayAppWebhookFixture(
  overrides: Partial<PayAppWebhookFixture> = {}
): PayAppWebhookFixture {
  return {
    linkval: "signed-link-value",
    mul_no: "mul-0001",
    pay_state: "4",
    var1: "user-123:pro",
    var2: "subscription",
    rebill_no: "rebill-001",
    encBill: "enc-bill-001",
    price: "39000",
    pay_type: "card",
    receipt_url: "https://payapp.kr/receipt/mul-0001",
    pay_date: formatPayAppDateTime(new Date()),
    ...overrides,
  };
}

export function toPayAppFormBody<T extends object>(fields: T): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(fields) as Array<[string, string | undefined]>) {
    if (value !== undefined) {
      params.set(key, value);
    }
  }

  return params.toString();
}

export function createPayAppApiResponse(overrides: Record<string, string> = {}): string {
  return toPayAppFormBody({
    state: "1",
    message: "OK",
    mul_no: "mul-0001",
    ...overrides,
  });
}
