import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/shared/lib/supabase";
import { addDaysToKstDate, getKstDateString } from "@/shared/lib/payapp-time";

/**
 * PayApp returnurl handler.
 *
 * With `skip_cstpage=y`, PayApp POSTs 매출전표 params (pay_state, rebill_no, var1,
 * mul_no, price) to this URL from the browser as a cross-site form submit —
 * auth cookies (SameSite=Lax) do NOT cross, so we trust var1 (`userId:plan`)
 * as the user identifier. Idempotent on rebill_no; webhook may have fired first.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const payState = Number(form.get("pay_state") ?? "0");
  const rebillNo = String(form.get("rebill_no") ?? "");
  const mulNo = String(form.get("mul_no") ?? "");
  const var1 = String(form.get("var1") ?? "");
  const price = Number(form.get("price") ?? "0");

  const origin = new URL(request.url).origin;

  if (payState !== 4 || !rebillNo) {
    return NextResponse.redirect(new URL("/checkout?error=payment_failed", origin), 303);
  }

  const colonIdx = var1.indexOf(":");
  const userId = colonIdx > 0 ? var1.slice(0, colonIdx) : "";
  const plan = colonIdx > 0 ? var1.slice(colonIdx + 1) : "";

  if (!userId || (plan !== "basic" && plan !== "pro")) {
    return NextResponse.redirect(new URL("/settings?from=payment", origin), 303);
  }

  try {
    const supabase = await createServerClient();

    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("rebill_no", rebillNo)
      .maybeSingle();

    if (!existing) {
      const todayKst = getKstDateString();
      const nextPeriodEnd = addDaysToKstDate(todayKst, 30);
      const nowIso = new Date().toISOString();

      await supabase.from("subscriptions").insert({
        user_id: userId,
        plan,
        rebill_no: rebillNo,
        status: "active",
        current_period_end: nextPeriodEnd,
        next_billing_date: nextPeriodEnd,
        last_charged_at: nowIso,
      });

      if (mulNo) {
        await supabase.from("payment_history").upsert(
          {
            user_id: userId,
            mul_no: mulNo,
            rebill_no: rebillNo,
            amount: price,
            status: "success",
            purpose: "subscription",
          },
          { onConflict: "mul_no" }
        );
      }
    }
  } catch (err) {
    console.error("[activate-from-return] error:", err instanceof Error ? err.message : err);
  }

  return NextResponse.redirect(new URL("/settings?from=payment", origin), 303);
}

/** Fallback: user lands here via GET (no skip_cstpage) — just bounce to settings. */
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/settings?from=payment", request.url));
}
