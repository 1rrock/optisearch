import { z } from "zod";
import { generateDraft } from "@/services/ai-service";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { recordAndEnforce } from "@/services/usage-service";
import { checkRateLimit } from "@/shared/lib/rate-limit";
import { resolveEnrichment } from "@/services/enrichment-service";

const bodySchema = z.object({
  keyword: z.string().min(1),
  postType: z.enum(["정보성", "리뷰", "리스트형", "비교분석"]).optional().default("정보성"),
  // Frontend sends "length" as string ("500","1000","1500","2500"), backend expects "targetLength" as number
  // Accept both field names and coerce string→number for compatibility
  targetLength: z.coerce.number().min(500).max(5000).optional(),
  length: z.coerce.number().min(500).max(5000).optional(),
  /** 키워드 맥락 힌트 — 다의어 문제 해결용 (예: "마스터스 골프 대회") */
  hint: z.string().max(300).optional(),
}).transform((data) => ({
  keyword: data.keyword,
  postType: data.postType,
  targetLength: data.targetLength ?? data.length ?? 1500,
  hint: data.hint,
}));

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

  const usage = await recordAndEnforce(user.userId, user.plan, "draft", parsed.data.keyword);
  if (!usage.allowed) {
    return Response.json(
      { error: `일일 사용 한도를 초과했습니다. (${usage.used}/${usage.limit})`, code: "USAGE_LIMIT_EXCEEDED", used: usage.used, limit: usage.limit },
      { status: 429 }
    );
  }

  try {
    const enrichment = await resolveEnrichment(user.userId, parsed.data.keyword, "draft");
    const draft = await generateDraft(parsed.data.keyword, parsed.data.postType, parsed.data.targetLength, enrichment, parsed.data.hint);
    return Response.json({ draft });
  } catch (err) {
    console.error("[api/ai/draft] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
