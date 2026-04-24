/**
 * PayApp SDK wrapper — REBILL(정기결제) 전용.
 * billKey/billPay 등 server-to-server 카드 API는 사용하지 않는다.
 *
 * API endpoint: https://api.payapp.kr/oapi/apiLoad.html
 */

import crypto from "crypto";

export interface PayAppRebillResult {
  state: 0 | 1;
  rebillNo?: string;
  mulNo?: string;
  payurl?: string;
  errorMessage?: string;
  raw: Record<string, string>;
}

interface RegisterRebillParams {
  goodname: string;
  goodprice: number;
  recvphone: string;
  /** 결제 주기 타입 ('Month' | 'Week' | 'Day') */
  rebillCycleType: "Month" | "Week" | "Day";
  /** 정기결제 만료일 (YYYY-MM-DD) */
  rebillExpire: string;
  /** 월간 결제일 (1-31, 90=말일) */
  rebillCycleMonth?: number;
  var1?: string;
  var2?: string;
  openpaytype?: string;
  smsuse?: "y" | "n";
  feedbackurl?: string;
  returnurl?: string;
  failurl?: string;
  /** `y`: 매출전표 스킵, returnurl로 결제정보를 POST 전달 */
  skip_cstpage?: "y" | "n";
}

interface CancelPaymentParams {
  mulNo: string;
  memo: string;
  partcancel?: "y" | "n";
  cancelprice?: number;
}

const PAYAPP_API_URL =
  process.env.PAYAPP_API_URL?.trim() || "https://api.payapp.kr/oapi/apiLoad.html";
const TIMEOUT_MS = 30_000;

export class PayAppTimeoutError extends Error {
  constructor(message = `[payapp] Request timed out after ${TIMEOUT_MS}ms`) {
    super(message);
    this.name = "PayAppTimeoutError";
  }
}

export function isPayAppTimeoutError(error: unknown): error is PayAppTimeoutError {
  return error instanceof PayAppTimeoutError;
}

/** 오늘로부터 N년 후의 YYYY-MM-DD 문자열 (PayApp KST 기준). */
export function defaultRebillExpire(yearsFromNow = 4): string {
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  kstNow.setUTCFullYear(kstNow.getUTCFullYear() + yearsFromNow);
  return kstNow.toISOString().slice(0, 10);
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`[payapp] Environment variable ${key} is not set.`);
  }
  return value;
}

function buildBaseParams(): Record<string, string> {
  return {
    userid: getRequiredEnv("PAYAPP_USERID"),
    linkkey: getRequiredEnv("PAYAPP_LINK_KEY"),
  };
}

async function callApi(
  params: Record<string, string | number | undefined>
): Promise<Record<string, string>> {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      body.append(key, String(value));
    }
  }

  if (process.env.NODE_ENV !== "production") {
    const safe = { ...params, linkkey: "[REDACTED]" };
    console.log("[payapp] REQUEST →", safe);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let responseText: string;
  try {
    const response = await fetch(PAYAPP_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: controller.signal,
    });
    responseText = await response.text();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new PayAppTimeoutError();
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const result = Object.fromEntries(new URLSearchParams(responseText).entries());

  if (process.env.NODE_ENV !== "production") {
    console.log("[payapp] RESPONSE ←", result);
  }

  return result;
}

function parseResult(raw: Record<string, string>): PayAppRebillResult {
  const state = raw.state === "1" ? 1 : 0;
  return {
    state,
    rebillNo: raw.rebill_no ?? undefined,
    mulNo: raw.mul_no ?? undefined,
    payurl: raw.payurl ?? undefined,
    errorMessage:
      state === 0
        ? raw.errorMessage ?? raw.message ?? raw.errormessage ?? "Unknown error"
        : undefined,
    raw,
  };
}

/** 정기결제 등록. payurl 반환 → 사용자가 PayApp 페이지에서 카드 입력 + 첫 결제. */
export async function registerRebill(
  params: RegisterRebillParams
): Promise<PayAppRebillResult> {
  const raw = await callApi({
    ...buildBaseParams(),
    cmd: "rebillRegist",
    goodname: params.goodname,
    goodprice: params.goodprice,
    recvphone: params.recvphone,
    rebillCycleType: params.rebillCycleType,
    rebillExpire: params.rebillExpire,
    ...(params.rebillCycleMonth !== undefined && { rebillCycleMonth: params.rebillCycleMonth }),
    ...(params.var1 !== undefined && { var1: params.var1 }),
    ...(params.var2 !== undefined && { var2: params.var2 }),
    ...(params.openpaytype !== undefined && { openpaytype: params.openpaytype }),
    ...(params.smsuse !== undefined && { smsuse: params.smsuse }),
    ...(params.feedbackurl !== undefined && { feedbackurl: params.feedbackurl }),
    ...(params.returnurl !== undefined && { returnurl: params.returnurl }),
    ...(params.failurl !== undefined && { failurl: params.failurl }),
    ...(params.skip_cstpage !== undefined && { skip_cstpage: params.skip_cstpage }),
  });
  return parseResult(raw);
}

/** 정기결제 완전 취소 (rebill_no 재사용 불가). */
export async function cancelRebill(rebillNo: string): Promise<PayAppRebillResult> {
  const raw = await callApi({
    ...buildBaseParams(),
    cmd: "rebillCancel",
    rebill_no: rebillNo,
  });
  return parseResult(raw);
}

/** 정기결제 일시정지 (다음 주기 청구만 중단, 이용 기간은 유지). */
export async function stopRebill(rebillNo: string): Promise<PayAppRebillResult> {
  const raw = await callApi({
    ...buildBaseParams(),
    cmd: "rebillStop",
    rebill_no: rebillNo,
  });
  return parseResult(raw);
}

/** 정기결제 재개. */
export async function startRebill(rebillNo: string): Promise<PayAppRebillResult> {
  const raw = await callApi({
    ...buildBaseParams(),
    cmd: "rebillStart",
    rebill_no: rebillNo,
  });
  return parseResult(raw);
}

/**
 * 단건 결제 취소/환불. 정산 완료(D+5) 후에는 paycancelreq(환불 요청)로 폴백.
 */
export async function cancelPayment(
  params: CancelPaymentParams
): Promise<PayAppRebillResult> {
  const basePayload = {
    ...buildBaseParams(),
    cmd: "paycancel",
    mul_no: params.mulNo,
    memo: params.memo,
    ...(params.partcancel !== undefined && { partcancel: params.partcancel }),
    ...(params.cancelprice !== undefined && { cancelprice: params.cancelprice }),
  };

  const raw = await callApi(basePayload);
  const result = parseResult(raw);

  if (result.state === 0 && raw.errorcode === "E0040") {
    const fallback = await callApi({
      ...buildBaseParams(),
      cmd: "paycancelreq",
      mul_no: params.mulNo,
      memo: params.memo,
      ...(params.cancelprice !== undefined && { cancelprice: params.cancelprice }),
    });
    return parseResult(fallback);
  }

  return result;
}

/** 웹훅 linkval 서명 검증 (timing-safe). */
export function verifyWebhookLinkVal(linkval: string): boolean {
  const expected = process.env.PAYAPP_LINK_VAL;
  if (!expected) {
    throw new Error("[payapp] PAYAPP_LINK_VAL environment variable is not set.");
  }
  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(linkval, "utf8");
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}
