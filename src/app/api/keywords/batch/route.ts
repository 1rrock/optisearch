import { z } from "zod";
import { analyzeKeywordBatch } from "@/services/keyword-service";
import { getAuthenticatedUser, recordUsage } from "@/shared/lib/api-helpers";
import { checkRateLimit } from "@/shared/lib/rate-limit";
import { checkUsageLimit } from "@/services/usage-service";
import { PLAN_LIMITS } from "@/shared/config/constants";

const bodySchema = z.object({
  keywords: z.array(z.string().min(1)).min(1).max(PLAN_LIMITS.pro.bulkKeywordsPerRun),
});

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const rateLimitResult = await checkRateLimit(user.userId);
  if (!rateLimitResult.allowed) {
    return Response.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  // Bulk analysis is paid-only
  if (PLAN_LIMITS[user.plan].bulkKeywordsPerRun === -1) {
    return Response.json(
      { error: "대량 분석은 베이직 이상 플랜에서 이용 가능합니다.", code: "PLAN_UPGRADE_REQUIRED" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const { keywords } = parsed.data;
    const maxPerRun = PLAN_LIMITS[user.plan].bulkKeywordsPerRun;

    // Enforce per-run keyword limit
    if (keywords.length > maxPerRun) {
      return Response.json(
        { error: `한 번에 최대 ${maxPerRun}개 키워드까지 분석할 수 있습니다.` },
        { status: 400 }
      );
    }

    // Check remaining daily quota and cap batch size
    const { allowed, used, limit } = await checkUsageLimit(user.userId, user.plan, "search");
    if (!allowed) {
      return Response.json(
        { error: `일일 사용 한도를 초과했습니다. (${used}/${limit})`, code: "USAGE_LIMIT_EXCEEDED", used, limit },
        { status: 429 }
      );
    }

    const remaining = limit === -1 ? keywords.length : limit - used;
    const processable = keywords.slice(0, remaining);

    const results = await analyzeKeywordBatch(processable);

    // Record usage for each processed keyword
    await Promise.all(
      processable.map((kw) => recordUsage(user.userId, "search", kw))
    );

    return Response.json({
      results,
      meta: {
        requested: keywords.length,
        processed: processable.length,
        ...(processable.length < keywords.length && {
          truncated: true,
          message: `일일 한도로 인해 ${processable.length}개만 분석되었습니다.`,
        }),
      },
    });
  } catch (err) {
    console.error("[api/keywords/batch] Error:", err);
    return Response.json({ error: "키워드 배치 분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}
