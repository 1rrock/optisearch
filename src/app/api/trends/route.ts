import { z } from "zod";
import { getKeywordTrend, detectSeasonality } from "@/services/trend-service";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { PLAN_LIMITS } from "@/shared/config/constants";
import { checkRateLimit } from "@/shared/lib/rate-limit";

const bodySchema = z.object({
  keywords: z.array(z.string().min(1)).min(1).max(5),
  months: z.number().min(1).max(24).optional().default(12),
  device: z.enum(["pc", "mo"]).optional(),
  gender: z.enum(["m", "f"]).optional(),
  ages: z.array(z.string()).optional(),
  timeUnit: z.enum(["week", "month"]).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  // No usage counting — trends are supplementary data. But rate limit
  // to prevent abuse of Naver DataLab API quota.
  const rateLimitResult = await checkRateLimit(user.userId);
  if (!rateLimitResult.allowed) {
    return Response.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  try {
    const { keywords, device, gender, ages, timeUnit } = parsed.data;
    const limits = PLAN_LIMITS[user.plan];

    // Enforce plan-based trend period limit
    const maxMonths = limits.trendPeriodMonths === -1 ? 24 : limits.trendPeriodMonths;
    const months = Math.min(parsed.data.months, maxMonths);

    // Enforce demographics filter restriction
    const effectiveGender = limits.demographicsEnabled ? gender : undefined;
    const effectiveAges = limits.demographicsEnabled ? ages : undefined;

    // Fetch requested period for display
    const trends = await getKeywordTrend(keywords, months, device, effectiveGender, effectiveAges, timeUnit);

    // Detect seasonality using 36-month data (reuses cache if same keyword)
    // Only for single-keyword requests to save DataLab quota
    let seasonality = null;
    if (keywords.length === 1 && months >= 12) {
      const longTrend = months >= 24
        ? trends[0]
        : (await getKeywordTrend(keywords, 36))[0];
      if (longTrend) {
        seasonality = detectSeasonality(longTrend.data);
      }
    }

    return Response.json({ trends, seasonality });
  } catch (err) {
    console.error("[api/trends] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
