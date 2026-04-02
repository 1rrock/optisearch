import { z } from "zod";
import { analyzeKeyword } from "@/services/keyword-service";
import { checkAdult, correctTypo } from "@/shared/lib/naver-search";
import { getAuthenticatedUser, enforceUsageLimit, recordUsage } from "@/shared/lib/api-helpers";

const bodySchema = z.object({
  keyword: z.string().min(1),
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

  const limitError = await enforceUsageLimit(user.userId, user.plan, "search");
  if (limitError) return limitError;

  try {
    const { keyword } = parsed.data;

    const [adultResult, typoResult] = await Promise.all([
      checkAdult(keyword),
      correctTypo(keyword),
    ]);

    if (adultResult.adult === "1") {
      return Response.json(
        { error: "성인 키워드는 분석할 수 없습니다." },
        { status: 400 }
      );
    }

    const correctedKeyword = typoResult.errata ? typoResult.errata : null;
    const effectiveKeyword = correctedKeyword ?? keyword;

    const result = await analyzeKeyword(effectiveKeyword);
    await recordUsage(user.userId, "search", effectiveKeyword);
    return Response.json({ ...result, correctedKeyword });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
