import { z } from "zod";
import { analyzeKeyword } from "@/services/keyword-service";
import { checkAdult, correctTypo } from "@/shared/lib/naver-search";
import { getAuthenticatedUser, enforceUsageLimit, recordUsage } from "@/shared/lib/api-helpers";
import { saveSearchHistory } from "@/services/history-service";
import { checkRateLimit } from "@/shared/lib/rate-limit";

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

  const rateLimitResult = await checkRateLimit(user.userId);
  if (!rateLimitResult.allowed) {
    return Response.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      {
        status: 429,
        headers: {
          "Retry-After": "60",
          "X-RateLimit-Remaining": String(rateLimitResult.remaining),
        },
      }
    );
  }

  const limitError = await enforceUsageLimit(user.userId, user.plan, "search");
  if (limitError) return limitError;

  // TODO: Turnstile CAPTCHA — 프론트 위젯 구현 후 활성화

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
    // Save search history (non-blocking)
    saveSearchHistory(user.userId, result).catch((err) => console.error("[keywords] saveHistory failed:", err));
    return Response.json({ ...result, correctedKeyword });
  } catch (err) {
    console.error("[api/keywords] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
