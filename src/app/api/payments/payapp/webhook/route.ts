import { verifyWebhookLinkVal } from "@/shared/lib/payapp";
import { createServerClient } from "@/shared/lib/supabase";
import { addDaysToKstDate, getKstDateString } from "@/shared/lib/payapp-time";
import { buildWebhookKeys, parsePayAppWebhook } from "../_lib/payapp-webhook";

type SupabaseClient = Awaited<ReturnType<typeof createServerClient>>;

const PAY_STATE_SUCCESS = 4;
const PAY_STATE_CANCEL = 9;
const PAY_STATE_REFUND = 64;

function verifyWebhookLinkValSafe(linkval: string): boolean {
  try {
    return verifyWebhookLinkVal(linkval);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const formText = await request.text();
  const payload = parsePayAppWebhook(formText);

  if (!payload.linkval || !verifyWebhookLinkValSafe(payload.linkval)) {
    console.warn("[payapp webhook] linkval verification failed");
    return new Response("invalid PayApp linkval", { status: 400 });
  }

  if (!payload.rebillNo && !payload.mulNo) {
    return new Response("SUCCESS", { status: 200 });
  }

  const supabase = await createServerClient();
  const { eventKey, lifecycleKey } = buildWebhookKeys(payload);

  // Idempotency: 이미 처리된 이벤트는 바로 SUCCESS 응답
  const { data: existingEvent } = await supabase
    .from("webhook_events")
    .select("id, processing_status")
    .eq("event_key", eventKey)
    .maybeSingle();

  if (existingEvent?.processing_status === "processed") {
    return new Response("SUCCESS", { status: 200 });
  }

  // 이벤트 기록 (PROCESSING 상태)
  if (!existingEvent) {
    const { error: insertError } = await supabase.from("webhook_events").insert({
      provider: "payapp",
      event_key: eventKey,
      lifecycle_key: lifecycleKey,
      mul_no: payload.mulNo,
      pay_state: payload.payState,
      purpose: payload.purpose,
      user_id: payload.userId,
      rebill_no: payload.rebillNo,
      provider_paid_at: payload.payDateIso,
      provider_cancelled_at: payload.cancelDateIso,
      processing_status: "received",
      raw: payload.raw,
    });
    if (insertError) {
      console.error("[payapp webhook] event insert failed:", insertError.message);
      return new Response("event-insert-failed", { status: 500 });
    }
  }

  try {
    if (payload.payState === PAY_STATE_SUCCESS) {
      await handleSuccess(supabase, payload);
    } else if (
      payload.payState === PAY_STATE_CANCEL ||
      payload.payState === PAY_STATE_REFUND
    ) {
      await handleCancel(supabase, payload);
    }

    await supabase
      .from("webhook_events")
      .update({ processing_status: "processed", processed_at: new Date().toISOString() })
      .eq("event_key", eventKey);

    return new Response("SUCCESS", { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[payapp webhook] processing failed:", message);
    await supabase
      .from("webhook_events")
      .update({ processing_status: "failed", failure_reason: message })
      .eq("event_key", eventKey);
    return new Response("processing-failed", { status: 500 });
  }
}

async function handleSuccess(
  supabase: SupabaseClient,
  payload: ReturnType<typeof parsePayAppWebhook>
) {
  if (!payload.rebillNo) return;

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, status, plan, current_period_end")
    .eq("rebill_no", payload.rebillNo)
    .maybeSingle();

  const todayKst = getKstDateString();

  if (!sub) {
    // 결제 완료 전에 DB row가 없는 경우 (뒤로가기 후 재결제 등) — 여기서 생성
    const plan = payload.planFromVar1;
    if (!plan || !payload.userId) {
      console.warn("[payapp webhook] cannot create subscription: missing plan/userId in var1");
      return;
    }
    const nextPeriodEnd = addDaysToKstDate(todayKst, 30);
    await supabase.from("subscriptions").insert({
      user_id: payload.userId,
      plan,
      rebill_no: payload.rebillNo,
      status: "active",
      current_period_end: nextPeriodEnd,
      next_billing_date: nextPeriodEnd,
      last_charged_at: payload.payDateIso ?? new Date().toISOString(),
    });
    await recordPaymentHistory(supabase, payload, "success");
    return;
  }

  const periodBase =
    sub.current_period_end && sub.status === "active"
      ? String(sub.current_period_end).slice(0, 10)
      : todayKst;
  const nextPeriodEnd = addDaysToKstDate(periodBase, 30);

  await supabase
    .from("subscriptions")
    .update({
      status: "active",
      current_period_end: nextPeriodEnd,
      next_billing_date: nextPeriodEnd,
      last_charged_at: payload.payDateIso ?? new Date().toISOString(),
    })
    .eq("id", sub.id);

  await recordPaymentHistory(supabase, payload, "success");
}

async function handleCancel(
  supabase: SupabaseClient,
  payload: ReturnType<typeof parsePayAppWebhook>
) {
  if (!payload.rebillNo) return;

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, status")
    .eq("rebill_no", payload.rebillNo)
    .maybeSingle();

  if (!sub) return;

  await supabase
    .from("subscriptions")
    .update({
      status: "stopped",
      stopped_reason: "refunded",
      canceled_at: payload.cancelDateIso ?? new Date().toISOString(),
    })
    .eq("id", sub.id);

  await recordPaymentHistory(supabase, payload, "cancelled");
}

async function recordPaymentHistory(
  supabase: SupabaseClient,
  payload: ReturnType<typeof parsePayAppWebhook>,
  kind: "success" | "cancelled"
) {
  if (!payload.mulNo) return;
  const { error } = await supabase.from("payment_history").upsert(
    {
      user_id: payload.userId,
      mul_no: payload.mulNo,
      rebill_no: payload.rebillNo,
      amount: payload.price,
      pay_state: payload.payState,
      pay_type: payload.payType,
      purpose: payload.purpose,
      receipt_url: payload.receiptUrl,
      paid_at: payload.payDateIso ?? new Date().toISOString(),
      raw: payload.raw,
    },
    { onConflict: "mul_no" }
  );
  if (error) {
    console.error("[payapp webhook] payment_history upsert failed:", error.message);
  }
}
