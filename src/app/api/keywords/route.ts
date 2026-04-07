import { z } from "zod";
import { analyzeKeyword } from "@/services/keyword-service";
import { checkAdult, correctTypo } from "@/shared/lib/naver-search";
import { getAuthenticatedUser, enforceUsageLimit, recordUsage } from "@/shared/lib/api-helpers";
import { saveSearchHistory } from "@/services/history-service";
import { checkRateLimit } from "@/shared/lib/rate-limit";
import { verifyTurnstileToken } from "@/shared/lib/turnstile";
import { createErrorResponse } from "@/shared/lib/api-handler";

const bodySchema = z.object({
  keyword: z.string().min(1),
  turnstileToken: z.string().optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("INVALID_JSON", "Invalid JSON body", 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return createErrorResponse("VALIDATION_FAILED", "Validation failed", 422, parsed.error.flatten());
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return createErrorResponse("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
  }

  const rateLimitResult = await checkRateLimit(user.userId);
  if (!rateLimitResult.allowed) {
    return createErrorResponse(
      "RATE_LIMIT_EXCEEDED",
      "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
      429,
      undefined,
      {
        headers: {
          "Retry-After": "60",
          "X-RateLimit-Remaining": String(rateLimitResult.remaining),
        },
      }
    );
  }

  const limitError = await enforceUsageLimit(user.userId, user.plan, "search");
  if (limitError) return limitError;

  // Turnstile CAPTCHA for free plan users
  if (user.plan === "free" && process.env.TURNSTILE_SECRET_KEY) {
    const { turnstileToken } = parsed.data;
    if (!turnstileToken) {
      return createErrorResponse("CAPTCHA_REQUIRED", "CAPTCHA 검증이 필요합니다.", 403);
    }
    const valid = await verifyTurnstileToken(turnstileToken);
    if (!valid) {
      return createErrorResponse("CAPTCHA_FAILED", "CAPTCHA 검증에 실패했습니다.", 403);
    }
  }

  try {
    const { keyword } = parsed.data;

    const [adultResult, typoResult] = await Promise.all([
      checkAdult(keyword),
      correctTypo(keyword),
    ]);

    if (adultResult.adult === "1") {
      return createErrorResponse("ADULT_KEYWORD_BLOCKED", "성인 키워드는 분석할 수 없습니다.", 400);
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
    return createErrorResponse("INTERNAL_ERROR", "서버 오류가 발생했습니다.", 500);
  }
}
