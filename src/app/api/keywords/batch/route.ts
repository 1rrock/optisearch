import { z } from "zod";
import { analyzeKeywordBatch } from "@/services/keyword-service";
import { getAuthenticatedUser, enforceUsageLimit } from "@/shared/lib/api-helpers";
import { checkRateLimit } from "@/shared/lib/rate-limit";

const bodySchema = z.object({
  keywords: z.array(z.string().min(1)).min(1).max(50),
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

  const limitError = await enforceUsageLimit(user.userId, user.plan, "search");
  if (limitError) return limitError;

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
    const results = await analyzeKeywordBatch(keywords);
    return Response.json({ results });
  } catch (err) {
    console.error("[api/keywords/batch] Error:", err);
    return Response.json({ error: "키워드 배치 분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}
