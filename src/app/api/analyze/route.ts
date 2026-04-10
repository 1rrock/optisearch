import { z } from "zod";
import { analyzeKeyword } from "@/services/keyword-service";
import { checkAdult, correctTypo } from "@/shared/lib/naver-search";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { PLAN_LIMITS } from "@/shared/config/constants";
import { checkRateLimit } from "@/shared/lib/rate-limit";
import { recordAndEnforce } from "@/services/usage-service";
import { verifyAnalysisToken } from "@/shared/lib/analysis-token";

const bodySchema = z.object({
  keyword: z.string().min(1),
  analysisToken: z.string().optional(),
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

  const { keyword } = parsed.data;

  const [user, adultResult, typoResult] = await Promise.all([
    getAuthenticatedUser(),
    checkAdult(keyword),
    correctTypo(keyword),
  ]);

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  // Rate limit
  const rl = await checkRateLimit(user.userId);
  if (!rl.allowed) {
    return Response.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  const effectiveKeyword = (typoResult.errata ? typoResult.errata : null) ?? keyword;

  try {
    if (adultResult.adult === "1") {
      return Response.json(
        { error: "성인 키워드는 분석할 수 없습니다." },
        { status: 400 }
      );
    }

    const correctedKeyword = typoResult.errata ? typoResult.errata : null;

    const analysis = await analyzeKeyword(effectiveKeyword);

    // Token verification: skip credit deduction if valid analysisToken from /quick
    const tokenValid = parsed.data.analysisToken
      ? verifyAnalysisToken(parsed.data.analysisToken, user.userId, effectiveKeyword, "search") !== null
      : false;

    if (!tokenValid) {
      // No valid token — self-deduct (direct API call or expired/forged token)
      const usage = await recordAndEnforce(user.userId, user.plan, "search", effectiveKeyword);
      if (!usage.allowed) {
        return Response.json(
          { error: `일일 사용 한도를 초과했습니다. (${usage.used}/${usage.limit})`, code: "USAGE_LIMIT_EXCEEDED", used: usage.used, limit: usage.limit },
          { status: 429 }
        );
      }
    }

    // Apply plan-based restrictions
    const planLimits = PLAN_LIMITS[user.plan];
    const filteredAnalysis = {
      ...analysis,
      topPosts: analysis.topPosts
        ? analysis.topPosts.slice(0, planLimits.topPostsLimit)
        : null,
      sectionData: planLimits.sectionAnalysisEnabled ? analysis.sectionData : null,
    };

    return Response.json({
      analysis: filteredAnalysis,
      correctedKeyword,
      plan: user.plan,
    });
  } catch (err) {
    console.error("[api/analyze] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
