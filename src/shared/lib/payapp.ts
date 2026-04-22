/**
 * PayApp SDK wrapper for server-side usage only.
 * Handles REBILL (recurring billing) and one-off payment API calls.
 *
 * API endpoint: https://api.payapp.kr/oapi/apiLoad.html
 * Request: POST application/x-www-form-urlencoded
 * Response: application/x-www-form-urlencoded (e.g. state=1&message=OK&rebill_no=R123)
 */

import crypto from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  /** 결제 주기 타입 (예: 'M' = 월별) */
  rebillCycleType: string;
  /** 정기결제 만료일 (YYYY-MM-DD, 하이픈 포함) */
  rebillExpire: string;
  var1?: string;
  var2?: string;
  /**
   * 결제수단 제한 — 콤마 구분 (card, kakaopay, tosspay, naverpay 등)
   * 미지정 시 판매자 설정에 따름. 'phone' 제외 시 웹 전용 결제.
   */
  openpaytype?: string;
  /** SMS 발송 여부 (기본 'y') */
  smsuse?: "y" | "n";
  /** 결제완료 Feedback URL */
  feedbackurl?: string;
  /** 결제 완료 후 이동할 URL */
  returnurl?: string;
  /** 결제 실패 알림 URL (2회차 이후 자동결제 실패 시 호출) */
  failurl?: string;
  /** 결제 주기 일자 (1-31, 90=말일). 미지정 시 최초 결제일 기준 */
  rebillCycleMonth?: number;
}

interface CancelPaymentParams {
  mulNo: string;
  memo: string;
  partcancel?: "y" | "n";
  cancelprice?: number;
}

interface CreateOneOffPaymentParams {
  goodname: string;
  price: number;
  recvphone: string;
  var1?: string;
  var2?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const PAYAPP_API_URL = "https://api.payapp.kr/oapi/apiLoad.html";
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

/**
 * PayApp `rebillExpire` 기본값 — 오늘로부터 N년 후를 YYYY-MM-DD 형식으로 반환.
 * PayApp API는 하이픈 포함 ISO 날짜를 요구함.
 */
export function defaultRebillExpire(yearsFromNow = 4): string {
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  kstNow.setUTCFullYear(kstNow.getUTCFullYear() + yearsFromNow);
  return kstNow.toISOString().slice(0, 10);
}

const isDev = process.env.NODE_ENV !== "production";

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

  if (isDev) {
    const safeParams = { ...params, linkkey: "[REDACTED]" };
    console.log("[payapp] REQUEST →", safeParams);
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

  if (isDev) {
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
    errorMessage: state === 0 ? (raw.errorMessage ?? raw.message ?? raw.errormessage ?? "Unknown error") : undefined,
    raw,
  };
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * 정기결제 빌링키 등록 (rebillRegist)
 * 등록 즉시 첫 주기 청구가 발생하므로 주의.
 */
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
    ...(params.var1 !== undefined && { var1: params.var1 }),
    ...(params.var2 !== undefined && { var2: params.var2 }),
    ...(params.openpaytype !== undefined && { openpaytype: params.openpaytype }),
    ...(params.smsuse !== undefined && { smsuse: params.smsuse }),
    ...(params.feedbackurl !== undefined && { feedbackurl: params.feedbackurl }),
    ...(params.returnurl !== undefined && { returnurl: params.returnurl }),
    ...(params.failurl !== undefined && { failurl: params.failurl }),
    ...(params.rebillCycleMonth !== undefined && { rebillCycleMonth: params.rebillCycleMonth }),
  });
  return parseResult(raw);
}

/**
 * 정기결제 빌링키 완전 취소 (rebillCancel)
 * 취소 후 해당 rebill_no는 재사용 불가.
 */
export async function cancelRebill(rebillNo: string): Promise<PayAppRebillResult> {
  const raw = await callApi({
    ...buildBaseParams(),
    cmd: "rebillCancel",
    rebill_no: rebillNo,
  });
  return parseResult(raw);
}

/**
 * 정기결제 일시정지 (rebillStop)
 * 이용기간 만료까지 서비스 사용 가능, 다음 주기 청구만 중단.
 */
export async function stopRebill(rebillNo: string): Promise<PayAppRebillResult> {
  const raw = await callApi({
    ...buildBaseParams(),
    cmd: "rebillStop",
    rebill_no: rebillNo,
  });
  return parseResult(raw);
}

/**
 * 정기결제 재개 (rebillStart)
 * rebillStop 이후 다시 활성화.
 */
export async function startRebill(rebillNo: string): Promise<PayAppRebillResult> {
  const raw = await callApi({
    ...buildBaseParams(),
    cmd: "rebillStart",
    rebill_no: rebillNo,
  });
  return parseResult(raw);
}

/**
 * 결제 취소 (paycancel)
 * 정산 완료 후(D+5 이후) 취소 시도 시 자동으로 paycancelreq(환불 요청)로 폴백.
 */
export async function cancelPayment(
  params: CancelPaymentParams
): Promise<PayAppRebillResult> {
  const baseParams = {
    ...buildBaseParams(),
    cmd: "paycancel",
    mul_no: params.mulNo,
    memo: params.memo,
    ...(params.partcancel !== undefined && { partcancel: params.partcancel }),
    ...(params.cancelprice !== undefined && { cancelprice: params.cancelprice }),
  };

  const raw = await callApi(baseParams);
  const result = parseResult(raw);

  // 정산 완료 후 취소 불가 에러 코드 → paycancelreq 폴백
  if (result.state === 0 && raw.errorcode === "E0040") {
    if (isDev) {
      console.log("[payapp] paycancel failed with E0040, falling back to paycancelreq");
    }
    const fallbackRaw = await callApi({
      ...buildBaseParams(),
      cmd: "paycancelreq",
      mul_no: params.mulNo,
      memo: params.memo,
      ...(params.cancelprice !== undefined && { cancelprice: params.cancelprice }),
    });
    return parseResult(fallbackRaw);
  }

  return result;
}

/**
 * 1회 결제 요청 생성 (payrequest) — 업그레이드 차액결제 등에 사용
 * 반환된 파라미터를 프론트엔드 PayApp JS SDK에 전달.
 */
export async function createOneOffPayment(
  params: CreateOneOffPaymentParams
): Promise<PayAppRebillResult> {
  const raw = await callApi({
    ...buildBaseParams(),
    cmd: "payrequest",
    goodname: params.goodname,
    price: params.price,
    recvphone: params.recvphone,
    feedbackurl: getRequiredEnv("PAYAPP_FEEDBACK_URL"),
    ...(params.var1 !== undefined && { var1: params.var1 }),
    ...(params.var2 !== undefined && { var2: params.var2 }),
  });
  return parseResult(raw);
}

/**
 * 웹훅 linkval 서명 검증 (timing-safe compare)
 * Buffer 길이가 다를 경우 false 반환.
 */
export function verifyWebhookLinkVal(linkval: string): boolean {
  const expected = process.env.PAYAPP_LINK_VAL;
  if (!expected) {
    throw new Error("[payapp] PAYAPP_LINK_VAL environment variable is not set.");
  }

  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(linkval, "utf8");

  // 길이가 다르면 timingSafeEqual이 throw하므로 먼저 확인
  if (expectedBuf.length !== receivedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

// ---------------------------------------------------------------------------
// BillKey (billRegist + billPay) 타입 및 함수
// ---------------------------------------------------------------------------

export interface BillKeyResult {
  state: 0 | 1;
  billKey?: string;
  payurl?: string;
  mulNo?: string;
  errorMessage?: string;
  raw: Record<string, string>;
}

interface RegisterBillKeyParams {
  goodname: string;
  recvphone: string;
  var1?: string;
  var2?: string;
  feedbackurl?: string;
  returnurl?: string;
  smsuse?: "y" | "n";
  openpaytype?: string;
}

interface BillPayParams {
  billKey: string;
  goodname: string;
  price: number;
  recvphone: string;
  var1?: string;
  var2?: string;
  feedbackurl?: string;
}

interface DeleteBillKeyParams {
  billKey: string;
}

function parseBillKeyResult(raw: Record<string, string>): BillKeyResult {
  const state = raw.state === "1" ? 1 : 0;
  return {
    state,
    // PayApp 실제 필드명: encBill (암호화된 빌키)
    billKey: raw.encBill ?? undefined,
    payurl: raw.payurl ?? undefined,
    mulNo: raw.mul_no ?? undefined,
    errorMessage:
      state === 0
        ? (raw.errorMessage ?? raw.message ?? raw.errormessage ?? "Unknown error")
        : undefined,
    raw,
  };
}

/**
 * 빌키 등록 (billRegist) — 카드 등록만 하고 즉시 결제하지 않음.
 * 응답의 encBill 필드에 암호화된 빌키 반환. payurl로 카드 등록 페이지 이동.
 */
export async function registerBillKey(
  params: RegisterBillKeyParams
): Promise<BillKeyResult> {
  const raw = await callApi({
    ...buildBaseParams(),
    cmd: "billRegist",
    goodname: params.goodname,
    recvphone: params.recvphone,
    ...(params.var1 !== undefined && { var1: params.var1 }),
    ...(params.var2 !== undefined && { var2: params.var2 }),
    ...(params.feedbackurl !== undefined && { feedbackurl: params.feedbackurl }),
    ...(params.returnurl !== undefined && { returnurl: params.returnurl }),
    ...(params.smsuse !== undefined && { smsuse: params.smsuse }),
    ...(params.openpaytype !== undefined && { openpaytype: params.openpaytype }),
  });
  return parseBillKeyResult(raw);
}

/**
 * 빌키로 결제 실행 (billPay) — 서버 주도 정기결제.
 * encBill 파라미터로 빌키 전달. 성공 시 webhook pay_state=4 수신.
 */
export async function billPay(params: BillPayParams): Promise<BillKeyResult> {
  const raw = await callApi({
    ...buildBaseParams(),
    cmd: "billPay",
    encBill: params.billKey,
    goodname: params.goodname,
    price: params.price,
    recvphone: params.recvphone,
    ...(params.var1 !== undefined && { var1: params.var1 }),
    ...(params.var2 !== undefined && { var2: params.var2 }),
    ...(params.feedbackurl !== undefined && { feedbackurl: params.feedbackurl }),
  });
  return parseBillKeyResult(raw);
}

/**
 * 빌키 삭제 (billDelete) — 카드 등록 해제 (구독 해지 시 호출).
 * encBill 파라미터로 빌키 전달. best-effort (실패해도 DB는 stopped 처리).
 */
export async function deleteBillKey(
  params: DeleteBillKeyParams
): Promise<BillKeyResult> {
  const raw = await callApi({
    ...buildBaseParams(),
    cmd: "billDelete",
    encBill: params.billKey,
  });
  return parseBillKeyResult(raw);
}
