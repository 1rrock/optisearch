import { createServerClient } from "@/shared/lib/supabase";
import {
  registerRebill,
  cancelRebill,
  cancelPayment,
  defaultRebillExpire,
  billPay,
  deleteBillKey,
} from "@/shared/lib/payapp";
import { PLAN_PRICING } from "@/shared/config/constants";
import type { PlanId } from "@/shared/config/constants";
import { getKstDateString } from "@/shared/lib/payapp-time";
import {
  buildPaymentAttemptKey,
  resolveAttemptFailureStatus,
} from "@/shared/lib/payapp-launch-rules";

interface CronResults {
  pendingActivations: number;
  compensationRetries: number;
  compensationResolved: number;
  compensationEscalated: number;
  failedChargeDowngrades: number;
  billPaySent: number;
  errors: string[];
}

interface FailedCompensationRow {
  id: string;
  user_id: string;
  mul_no: string;
  step: string;
  payload: Record<string, unknown>;
  retry_count: number;
  last_error: string | null;
  next_retry_at: string;
  resolved_at: string | null;
  escalated: boolean;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  rebill_no: string | null;
  pending_plan: string | null;
  pending_action: "upgrade" | "downgrade" | null;
  pending_start_date: string | null;
  status: string | null;
  failed_charge_count: number | null;
}

interface BillableRow {
  id: string;
  user_id: string;
  bill_key: string;
  plan: string;
  pending_plan: string | null;
  pending_start_date: string | null;
  current_period_end: string | null;
  last_charged_at: string | null;
  failed_charge_count: number | null;
}

interface PaymentAttemptRow {
  id: string;
  status: string;
}

async function notifySlack(text: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    // swallow
  }
}

async function ensureRenewalAttempt(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  row: BillableRow,
  billingDate: string,
  amount: number
): Promise<PaymentAttemptRow> {
  const attemptKey = buildPaymentAttemptKey("renewal", row.id, billingDate);

  const { data: inserted, error: insertError } = await supabase
    .from("payment_attempts")
    .insert({
      attempt_key: attemptKey,
      user_id: row.user_id,
      subscription_id: row.id,
      attempt_kind: "renewal",
      status: "pending",
      amount,
      provider_request_payload: {
        plan: row.pending_plan ?? row.plan,
        nextBillingDate: billingDate,
      },
    })
    .select("id, status")
    .maybeSingle();

  if (!insertError && inserted) {
    return inserted as PaymentAttemptRow;
  }

  if (insertError && insertError.code !== "23505") {
    throw new Error(`[cron] payment_attempt insert failed: ${insertError.message}`);
  }

  const { data: existing, error: existingError } = await supabase
    .from("payment_attempts")
    .select("id, status")
    .eq("attempt_key", attemptKey)
    .maybeSingle();

  if (existingError || !existing) {
    throw new Error(`[cron] payment_attempt fetch failed: ${existingError?.message ?? "missing renewal attempt"}`);
  }

  return existing as PaymentAttemptRow;
}

/**
 * GET /api/cron/billing
 * 일일 배치 작업 (Vercel Cron, 매일 KST 00:05)
 *   (a) pending_action 활성화 - 레거시 rebill 시스템 (active + pending_action)
 *   (b) failed_compensations 재시도 (최대 3회 지수백오프) 및 escalate
 *   (c) failed_charge_count ≥ 3 구독 → stopped 강등
 *   (d) billPay 정기결제 실행 — 신규 bill_key 시스템
 */
export async function GET(request: Request) {
  // Vercel Cron 인증 (CRON_SECRET 있으면 Bearer 체크)
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = await createServerClient();
  const results: CronResults = {
    pendingActivations: 0,
    compensationRetries: 0,
    compensationResolved: 0,
    compensationEscalated: 0,
    failedChargeDowngrades: 0,
    billPaySent: 0,
    errors: [],
  };

  const todayKST = getKstDateString();
  const nowIso = new Date().toISOString();

  // ============= 작업 (a): pending_action 활성화 (레거시 rebill 전용) =============
  // bill_key 시스템: pending_plan은 Cron 섹션 D에서 billPay 시 자동 적용
  try {
    const { data: pending, error: pendingErr } = await supabase
      .from("subscriptions")
      .select(
        "id, user_id, rebill_no, pending_plan, pending_action, pending_start_date, status, failed_charge_count"
      )
      .not("pending_action", "is", null)
      .lte("pending_start_date", todayKST)
      .eq("status", "active")
      .is("bill_key", null); // 레거시 rebill 전용 (bill_key 없는 행만)

    if (pendingErr) {
      results.errors.push(`activation query: ${pendingErr.message}`);
    }

    for (const sub of (pending ?? []) as SubscriptionRow[]) {
      try {
        if (sub.pending_action === "upgrade") {
          // pro rebillRegist 신규 등록 (기존 rebill_no는 이미 cancelRebill 됨)
          // ⚠️ 레거시 시스템: 신규 사용자는 bill_key 시스템으로 진입
          const r = await registerRebill({
            goodname: "옵티서치 프로",
            goodprice: PLAN_PRICING.pro.monthly,
            recvphone: "01000000000", // 레거시: phone 없음. failed_compensations 필요 시 수동 처리
            rebillCycleType: "Month",
            rebillExpire: defaultRebillExpire(),
            var1: `${sub.user_id}:pro`,
            var2: "subscription",
          });
          if (r.state === 1 && r.rebillNo) {
            await supabase
              .from("subscriptions")
              .update({
                rebill_no: r.rebillNo,
                pending_plan: null,
                pending_action: null,
                pending_start_date: null,
              })
              .eq("id", sub.id);
            results.pendingActivations++;
          } else {
            await supabase.from("failed_compensations").insert({
              user_id: sub.user_id,
              mul_no: `cron-upgrade-${sub.id}-${Date.now()}`,
              step: "rebill_regist",
              payload: {
                plan: "pro",
                subId: sub.id,
                goodname: "옵티서치 프로",
                goodprice: PLAN_PRICING.pro.monthly,
                rebillCycleType: "Month",
                rebillExpire: defaultRebillExpire(),
                var1: `${sub.user_id}:pro`,
                var2: "subscription",
              },
              next_retry_at: new Date(Date.now() + 60_000).toISOString(),
              last_error: r.errorMessage ?? "rebillRegist failed",
            });
          }
        } else if (sub.pending_action === "downgrade") {
          // pro 기존 rebillCancel + basic rebillRegist (순차)
          if (sub.rebill_no) {
            const cancel = await cancelRebill(sub.rebill_no);
            if (cancel.state !== 1) {
              await supabase.from("failed_compensations").insert({
                user_id: sub.user_id,
                mul_no: `cron-downgrade-cancel-${sub.id}-${Date.now()}`,
                step: "rebill_cancel",
                payload: { rebillNo: sub.rebill_no, subId: sub.id },
                next_retry_at: new Date(Date.now() + 60_000).toISOString(),
                last_error: cancel.errorMessage ?? "rebillCancel failed",
              });
              continue;
            }
          }

          const reg = await registerRebill({
            goodname: "옵티서치 베이직",
            goodprice: PLAN_PRICING.basic.monthly,
            recvphone: "01000000000",
            rebillCycleType: "Month",
            rebillExpire: defaultRebillExpire(),
            var1: `${sub.user_id}:basic`,
            var2: "subscription",
          });
          if (reg.state === 1 && reg.rebillNo) {
            await supabase
              .from("subscriptions")
              .update({
                rebill_no: reg.rebillNo,
                pending_plan: null,
                pending_action: null,
                pending_start_date: null,
              })
              .eq("id", sub.id);
            results.pendingActivations++;
          } else {
            await supabase.from("failed_compensations").insert({
              user_id: sub.user_id,
              mul_no: `cron-downgrade-regist-${sub.id}-${Date.now()}`,
              step: "rebill_regist",
              payload: {
                plan: "basic",
                subId: sub.id,
                goodname: "옵티서치 베이직",
                goodprice: PLAN_PRICING.basic.monthly,
                rebillCycleType: "Month",
                rebillExpire: defaultRebillExpire(),
                var1: `${sub.user_id}:basic`,
                var2: "subscription",
              },
              next_retry_at: new Date(Date.now() + 60_000).toISOString(),
              last_error: reg.errorMessage ?? "rebillRegist failed",
            });
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.errors.push(`activation ${sub.id}: ${msg}`);
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    results.errors.push(`activation: ${msg}`);
  }

  // ============= 작업 (b): 실패 보상 재시도 =============
  try {
    const { data: failed, error: failedErr } = await supabase
      .from("failed_compensations")
      .select("*")
      .is("resolved_at", null)
      .lte("next_retry_at", nowIso)
      .lt("retry_count", 3)
      .limit(50);

    if (failedErr) {
      results.errors.push(`compensation query: ${failedErr.message}`);
    }

    for (const f of (failed ?? []) as FailedCompensationRow[]) {
      results.compensationRetries++;
      try {
        let success = false;
        let errorMessage: string | undefined;

        if (f.step === "rebill_cancel") {
          const rebillNo = f.payload.rebillNo;
          if (typeof rebillNo === "string") {
            const r = await cancelRebill(rebillNo);
            success = r.state === 1;
            errorMessage = r.errorMessage;
          } else {
            errorMessage = "invalid payload: rebillNo missing";
          }
        } else if (f.step === "paycancel") {
          const r = await cancelPayment({
            mulNo: f.mul_no,
            memo: "자동 보상",
          });
          success = r.state === 1;
          errorMessage = r.errorMessage;
        } else if (f.step === "rebill_regist") {
          const p = f.payload as {
            goodname?: string;
            goodprice?: number;
            recvphone?: string;
            rebillCycleType?: string;
            rebillExpire?: string;
            var1?: string;
            var2?: string;
          };
          if (
            typeof p.goodname === "string" &&
            typeof p.goodprice === "number" &&
            typeof p.recvphone === "string" &&
            typeof p.rebillCycleType === "string" &&
            typeof p.rebillExpire === "string"
          ) {
            const r = await registerRebill({
              goodname: p.goodname,
              goodprice: p.goodprice,
              recvphone: p.recvphone,
              rebillCycleType: p.rebillCycleType,
              rebillExpire: p.rebillExpire,
              var1: p.var1,
              var2: p.var2,
            });
            success = r.state === 1;
            errorMessage = r.errorMessage;
          } else {
            errorMessage = "invalid payload: rebill_regist params missing";
          }
        } else if (f.step === "webhook_stale_payment") {
          const p = f.payload as { mulNo?: string };
          const mulNo = typeof p.mulNo === "string" ? p.mulNo : f.mul_no;
          if (typeof mulNo === "string" && mulNo.length > 0) {
            const r = await cancelPayment({
              mulNo,
              memo: "stale payment auto-refund",
            });
            success = r.state === 1;
            errorMessage = r.errorMessage;
          } else {
            errorMessage = "invalid payload: mulNo missing";
          }
        } else if (f.step === "webhook_activation_update") {
          const p = f.payload as {
            userId?: string;
            plan?: string;
            periodEnd?: string;
            price?: number;
          };
          if (typeof p.userId === "string" && typeof p.plan === "string") {
            const update: Record<string, unknown> = {
              plan: p.plan,
              status: "active",
            };
            if (typeof p.periodEnd === "string") {
              update.current_period_end = p.periodEnd;
            }
            if (typeof p.price === "number") {
              update.price = p.price;
            }
            const { error: updErr } = await supabase
              .from("subscriptions")
              .update(update)
              .eq("user_id", p.userId);
            success = !updErr;
            errorMessage = updErr?.message;
          } else {
            errorMessage = "invalid payload: userId/plan missing";
          }
        } else if (f.step === "webhook_out_of_order") {
          // alert-only: 관리자 수동 검토용
          await notifySlack(
            `[ALERT] webhook_out_of_order manual review required: user=${f.user_id} mul_no=${f.mul_no} payload=${JSON.stringify(f.payload)}`
          );
          success = true;
        } else if (f.step === "bill_delete") {
          const p = f.payload as { billKey?: string };
          if (typeof p.billKey === "string") {
            const r = await deleteBillKey({ billKey: p.billKey });
            success = r.state === 1;
            errorMessage = r.errorMessage;
          } else {
            errorMessage = "invalid payload: billKey missing";
          }
        } else if (f.step === "billpay_failed_after_claim") {
          // alert-only: 수동 환불 검토 필요
          await notifySlack(
            `[ALERT] billpay_failed_after_claim manual refund review: user=${f.user_id} mul_no=${f.mul_no} last_error=${f.last_error ?? "n/a"} payload=${JSON.stringify(f.payload)}`
          );
          success = true;
        } else if (f.step === "prorated_refund") {
          // 해지 비례환불 재시도
          const p = f.payload as { refundAmount?: number; mulNo?: string };
          const mulNo = typeof p.mulNo === "string" ? p.mulNo : f.mul_no;
          const refundAmount = typeof p.refundAmount === "number" ? p.refundAmount : 0;
          if (typeof mulNo === "string" && refundAmount > 0) {
            const r = await cancelPayment({ mulNo, memo: "해지 비례환불 재시도", cancelprice: refundAmount });
            if (r.state === 1) {
              await supabase.from("payment_history")
                .update({ refunded_at: new Date().toISOString() })
                .eq("mul_no", mulNo);
              success = true;
            } else {
              errorMessage = r.errorMessage ?? "cancelPayment failed";
            }
          } else {
            errorMessage = "invalid payload: mulNo or refundAmount missing";
          }
        } else {
          errorMessage = `unknown step: ${f.step}`;
        }

        if (success) {
          await supabase
            .from("failed_compensations")
            .update({ resolved_at: new Date().toISOString() })
            .eq("id", f.id);
          results.compensationResolved++;
        } else {
          const newRetry = f.retry_count + 1;
          const backoffMs = Math.pow(5, newRetry) * 60 * 1000; // 5m, 25m, 125m
          await supabase
            .from("failed_compensations")
            .update({
              retry_count: newRetry,
              next_retry_at: new Date(Date.now() + backoffMs).toISOString(),
              last_error: errorMessage ?? `retry ${newRetry} failed`,
            })
            .eq("id", f.id);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const newRetry = f.retry_count + 1;
        const backoffMs = Math.pow(5, newRetry) * 60 * 1000;
        await supabase
          .from("failed_compensations")
          .update({
            retry_count: newRetry,
            next_retry_at: new Date(Date.now() + backoffMs).toISOString(),
            last_error: msg,
          })
          .eq("id", f.id);
        results.errors.push(`compensation ${f.id}: ${msg}`);
      }
    }

    // 3회 초과 → escalate
    const { data: escalatable, error: escErr } = await supabase
      .from("failed_compensations")
      .select("*")
      .is("resolved_at", null)
      .gte("retry_count", 3)
      .eq("escalated", false);

    if (escErr) {
      results.errors.push(`escalation query: ${escErr.message}`);
    }

    for (const e of (escalatable ?? []) as FailedCompensationRow[]) {
      await supabase
        .from("failed_compensations")
        .update({ escalated: true })
        .eq("id", e.id);
      results.compensationEscalated++;
      await notifySlack(
        `[ALERT] PayApp compensation escalated: user=${e.user_id} step=${e.step} mul_no=${e.mul_no} last_error=${e.last_error ?? "n/a"}`
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    results.errors.push(`compensation: ${msg}`);
  }

  // ============= 작업 (c): 결제실패 3회 이상 → stopped 강등 =============
  try {
    const { data: failedCharges, error: fcErr } = await supabase
      .from("subscriptions")
      .select("user_id")
      .gte("failed_charge_count", 3)
      .eq("status", "active");

    if (fcErr) {
      results.errors.push(`downgrade query: ${fcErr.message}`);
    }

    for (const s of (failedCharges ?? []) as { user_id: string }[]) {
      await supabase
        .from("subscriptions")
        .update({ status: "stopped", failed_charge_count: 0, bill_key: null, next_billing_date: null })
        .eq("user_id", s.user_id);
      results.failedChargeDowngrades++;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    results.errors.push(`downgrade: ${msg}`);
  }

  // ============= 작업 (d): billPay 정기결제 실행 (신규 bill_key 시스템) =============
  try {
    const { data: billableRows, error: billableErr } = await supabase
      .from("subscriptions")
      .select(
        "id, user_id, bill_key, plan, pending_plan, pending_start_date, " +
        "current_period_end, last_charged_at, failed_charge_count"
      )
      .eq("status", "active")
      .not("bill_key", "is", null)
      .lte("next_billing_date", todayKST);

    if (billableErr) {
      results.errors.push(`billPay query: ${billableErr.message}`);
    }

    for (const row of (billableRows ?? []) as unknown as BillableRow[]) {
      try {
        // 다운그레이드 예약 적용 체크
        let effectivePlan = row.plan;
        const applyPendingPlan =
          row.pending_plan &&
          row.pending_start_date &&
          row.pending_start_date <= todayKST;

        if (applyPendingPlan) {
          effectivePlan = row.pending_plan!;
        }

        const amount = PLAN_PRICING[effectivePlan as PlanId].monthly;
        const planLabel = effectivePlan === "pro" ? "프로" : "베이직";

        const attempt = await ensureRenewalAttempt(supabase, row, todayKST, amount);
        if (attempt.status !== "pending") {
          if (attempt.status === "dispatched" || attempt.status === "confirmed") {
            results.billPaySent++;
          }
          continue;
        }

        const result = await billPay({
          billKey: row.bill_key,
          goodname: `옵티서치 ${planLabel}`,
          price: amount,
          recvphone: process.env.PAYAPP_DEFAULT_RECVPHONE ?? "01000000000",
          var1: `${row.user_id}:${effectivePlan}`,
          var2: "subscription",
          feedbackurl: process.env.PAYAPP_FEEDBACK_URL,
        });

        if (result.state === 1) {
          const { error: attemptUpdateError } = await supabase
            .from("payment_attempts")
            .update({
              status: "dispatched",
              mul_no: result.mulNo ?? null,
              provider_response_payload: result.raw,
            })
            .eq("id", attempt.id);

          if (attemptUpdateError) {
            results.errors.push(`billPay attempt update ${row.id}: ${attemptUpdateError.message}`);
            continue;
          }

          results.billPaySent++;
          console.log("[CRON D] billPay sent:", { userId: row.user_id, plan: effectivePlan, amount });
        } else {
          const newCount = (row.failed_charge_count ?? 0) + 1;
          await supabase
            .from("payment_attempts")
            .update({
              status: "failed",
              provider_response_payload: result.raw,
              manual_review_reason: result.errorMessage ?? "billPay failed",
              resolved_at: new Date().toISOString(),
            })
            .eq("id", attempt.id);

          if (newCount >= 3) {
            await supabase.from("subscriptions")
              .update({ status: "stopped", failed_charge_count: newCount, next_billing_date: null, stopped_reason: "charge_failed" })
              .eq("id", row.id);
            results.failedChargeDowngrades++;
            await notifySlack(`[ALERT] 결제 3회 실패 → stopped: user=${row.user_id} plan=${effectivePlan}`);
          } else {
            // 다음날 재시도 (KST 기준)
            const retryDate = new Date(Date.now() + 9 * 60 * 60 * 1000);
            retryDate.setDate(retryDate.getDate() + 1);
            await supabase.from("subscriptions")
              .update({
                failed_charge_count: newCount,
                next_billing_date: retryDate.toISOString().slice(0, 10),
              })
              .eq("id", row.id);
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const attemptKey = buildPaymentAttemptKey("renewal", row.id, todayKST);
        await supabase
          .from("payment_attempts")
          .update({
            status: resolveAttemptFailureStatus(e),
            manual_review_reason: msg,
            provider_response_payload: { error: msg },
            resolved_at: new Date().toISOString(),
          })
          .eq("attempt_key", attemptKey);

        await supabase
          .from("subscriptions")
          .update({
            next_billing_date: null,
            last_manual_review_at: new Date().toISOString(),
            last_manual_review_reason: msg,
          })
          .eq("id", row.id);

        results.errors.push(`billPay ${row.id}: ${msg}`);
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    results.errors.push(`billPay section: ${msg}`);
  }

  // ============= 작업 (e): stopped / pending_cancel → expired 자동 전환 =============
  // current_period_end가 지난 stopped 또는 pending_cancel 구독을 expired로 전환
  try {
    const { error: expireErr } = await supabase
      .from("subscriptions")
      .update({ status: "expired", bill_key: null, rebill_no: null, stopped_reason: "expired" })
      .in("status", ["stopped", "pending_cancel"])
      .lt("current_period_end", todayKST);

    if (expireErr) {
      results.errors.push(`expire section: ${expireErr.message}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    results.errors.push(`expire section: ${msg}`);
  }

  // ── 헬스체크 기록 ──
  try {
    await supabase.from("cron_health").upsert({
      job: "billing",
      last_run_at: new Date().toISOString(),
      last_result: results,
    }, { onConflict: "job" });
  } catch (e) {
    // 헬스체크 실패는 결과에만 기록
    const msg = e instanceof Error ? e.message : String(e);
    results.errors.push(`cron_health upsert: ${msg}`);
  }

  console.log("[CRON billing]", results);

  // 에러 있으면 Slack 알림
  if (results.errors.length > 0) {
    await notifySlack(
      `[CRON ERROR] PayApp billing cron: ${results.errors.join("; ")}`
    );
  }

  return Response.json(results);
}
