import { z } from "zod";
import { generateDraft } from "@/services/ai-service";
import { getAuthenticatedUser, enforceUsageLimit, recordUsage } from "@/shared/lib/api-helpers";
import { checkRateLimit } from "@/shared/lib/rate-limit";

const bodySchema = z.object({
  keyword: z.string().min(1),
  postType: z.enum(["정보성", "리뷰", "리스트형", "비교분석"]).optional().default("정보성"),
  targetLength: z.number().min(500).max(5000).optional().default(1500),
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
    return Response.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const rateLimitResult = await checkRateLimit(user.userId);
  if (!rateLimitResult.allowed) {
    return Response.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  const limitError = await enforceUsageLimit(user.userId, user.plan, "draft");
  if (limitError) return limitError;

  try {
    const draft = await generateDraft(parsed.data.keyword, parsed.data.postType, parsed.data.targetLength);
    await recordUsage(user.userId, "draft", parsed.data.keyword);
    return Response.json({ draft });
  } catch (err) {
    console.error("[api/ai/draft] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
