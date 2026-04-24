import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { createServerClient } from "@/shared/lib/supabase";
import { addDaysToKstDate, getKstDateString } from "@/shared/lib/payapp-time";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // PayApp passes these as query params (snake_case in practice)
  const payState = Number(searchParams.get("pay_state") ?? searchParams.get("payState") ?? "0");
  const rebillNo = searchParams.get("rebill_no") ?? searchParams.get("rebillNo");
  const mulNo = searchParams.get("mul_no") ?? searchParams.get("mulNo");
  const var1 = searchParams.get("var1") ?? "";
  const price = Number(searchParams.get("price") ?? "0");

  // Payment not successful → back to checkout
  if (payState !== 4) {
    return NextResponse.redirect(new URL("/checkout?error=payment_failed", request.url));
  }

  if (!rebillNo) {
    return NextResponse.redirect(new URL("/checkout?error=payment_failed", request.url));
  }

  // Parse userId:plan from var1
  const colonIdx = var1.indexOf(":");
  const userId = colonIdx > 0 ? var1.slice(0, colonIdx) : var1;
  const plan = colonIdx > 0 ? var1.slice(colonIdx + 1) : null;

  if (!plan || !userId) {
    return NextResponse.redirect(new URL("/settings?from=payment", request.url));
  }

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const supabase = await createServerClient();

    // Idempotent: webhook may have already created the subscription
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
        user_id: user.userId,
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
            user_id: user.userId,
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
    // Don't fail hard — user paid, redirect to settings and let them see status
  }

  return NextResponse.redirect(new URL("/settings?from=payment", request.url));
}
