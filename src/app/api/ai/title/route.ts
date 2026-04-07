import { z } from "zod";
import { generateTitleSuggestions } from "@/services/ai-service";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { recordAndEnforce } from "@/services/usage-service";
import { checkRateLimit } from "@/shared/lib/rate-limit";

const bodySchema = z.object({
  keyword: z.string().min(1),
  context: z.string().optional(),
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

  const usage = await recordAndEnforce(user.userId, user.plan, "title", parsed.data.keyword);
  if (!usage.allowed) {
    return Response.json(
      { error: `일일 사용 한도를 초과했습니다. (${usage.used}/${usage.limit})`, code: "USAGE_LIMIT_EXCEEDED", used: usage.used, limit: usage.limit },
      { status: 429 }
    );
  }

  try {
    const suggestions = await generateTitleSuggestions(parsed.data.keyword, parsed.data.context);
    return Response.json({ suggestions });
  } catch (err) {
    console.error("[api/ai/title] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
