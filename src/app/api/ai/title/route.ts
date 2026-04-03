import { z } from "zod";
import { generateTitleSuggestions } from "@/services/ai-service";
import { getAuthenticatedUser, enforceUsageLimit, recordUsage } from "@/shared/lib/api-helpers";

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

  const limitError = await enforceUsageLimit(user.userId, user.plan, "title");
  if (limitError) return limitError;

  try {
    const suggestions = await generateTitleSuggestions(parsed.data.keyword, parsed.data.context);
    await recordUsage(user.userId, "title", parsed.data.keyword);
    return Response.json({ suggestions });
  } catch (err) {
    console.error("[api/ai/title] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
