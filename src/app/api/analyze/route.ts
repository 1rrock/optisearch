import { z } from "zod";
import { analyzeKeyword } from "@/services/keyword-service";
import { checkAdult, correctTypo } from "@/shared/lib/naver-search";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { PLAN_LIMITS } from "@/shared/config/constants";

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

  const { keyword } = parsed.data;

  const [user, adultResult, typoResult] = await Promise.all([
    getAuthenticatedUser(),
    checkAdult(keyword),
    correctTypo(keyword),
  ]);

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    if (adultResult.adult === "1") {
      return Response.json(
        { error: "성인 키워드는 분석할 수 없습니다." },
        { status: 400 }
      );
    }

    const correctedKeyword = typoResult.errata ? typoResult.errata : null;
    const effectiveKeyword = correctedKeyword ?? keyword;

    const analysis = await analyzeKeyword(effectiveKeyword);

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
