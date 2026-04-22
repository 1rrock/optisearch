import { createServerClient } from "@/shared/lib/supabase";

/**
 * GET /api/cron/health
 * Cron 마지막 실행 상태 조회 (외부 모니터링 연동용)
 * UptimeRobot 등에서 25시간 이상 미실행 감지에 활용.
 *
 * 인증 없음 (공개 엔드포인트) — 민감 데이터 미포함.
 */
export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("cron_health")
      .select("job, last_run_at, last_result")
      .eq("job", "billing")
      .maybeSingle();

    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return Response.json({ ok: false, error: "No cron run recorded yet" }, { status: 404 });
    }

    const lastRunAt = new Date(data.last_run_at);
    const hoursSinceLastRun = (Date.now() - lastRunAt.getTime()) / (1000 * 60 * 60);
    const isHealthy = hoursSinceLastRun < 25;

    const [
      pendingBillingResult,
      manualReviewResult,
      failedCompensationResult,
      webhookFailureResult,
    ] = await Promise.all([
      supabase.from("payapp_pending_billing_queue").select("user_id", { count: "exact", head: true }),
      supabase.from("payapp_manual_review_queue").select("reference_id", { count: "exact", head: true }),
      supabase.from("payapp_failed_compensation_backlog").select("id", { count: "exact", head: true }),
      supabase
        .from("webhook_events")
        .select("id", { count: "exact", head: true })
        .in("processing_status", ["failed", "manual_review"]),
    ]);

    return Response.json(
      {
        ok: isHealthy,
        job: data.job,
        lastRunAt: data.last_run_at,
        hoursSinceLastRun: Math.round(hoursSinceLastRun * 10) / 10,
        lastResult: data.last_result,
        ops: {
          pendingBillingCount: pendingBillingResult.count ?? 0,
          manualReviewCount: manualReviewResult.count ?? 0,
          unresolvedCompensationCount: failedCompensationResult.count ?? 0,
          webhookFailureCount: webhookFailureResult.count ?? 0,
        },
      },
      { status: isHealthy ? 200 : 503 }
    );
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
