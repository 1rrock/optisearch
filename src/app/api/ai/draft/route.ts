import { z } from "zod";
import { generateDraft } from "@/services/ai-service";
import { getAuthenticatedUser, enforceUsageLimit, recordUsage } from "@/shared/lib/api-helpers";

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

  const limitError = await enforceUsageLimit(user.userId, user.plan, "draft");
  if (limitError) return limitError;

  try {
    const draft = await generateDraft(parsed.data.keyword, parsed.data.postType, parsed.data.targetLength);
    await recordUsage(user.userId, "draft", parsed.data.keyword);
    return Response.json({ draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
