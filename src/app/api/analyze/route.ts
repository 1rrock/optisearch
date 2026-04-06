import { z } from "zod";
import { analyzeKeyword, getRelatedKeywords } from "@/services/keyword-service";
import { checkAdult, correctTypo, searchNews, searchWeb, searchEncyclopedia } from "@/shared/lib/naver-search";
import { getAuthenticatedUser, enforceUsageLimit, recordUsage } from "@/shared/lib/api-helpers";
import { saveSearchHistory } from "@/services/history-service";
import { PLAN_LIMITS } from "@/shared/config/constants";
import { checkRateLimit } from "@/shared/lib/rate-limit";
import { verifyTurnstileToken } from "@/shared/lib/turnstile";

const bodySchema = z.object({
  keyword: z.string().min(1),
  turnstileToken: z.string().optional(),
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
    return Response.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  // Turnstile CAPTCHA for free plan users (verify only when token is provided)
  if (user.plan === "free" && process.env.TURNSTILE_SECRET_KEY && parsed.data.turnstileToken) {
    const valid = await verifyTurnstileToken(parsed.data.turnstileToken);
    if (!valid) {
      return Response.json({ error: "CAPTCHA 검증에 실패했습니다.", code: "CAPTCHA_FAILED" }, { status: 403 });
    }
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

    const [analysis, relatedKeywords, newsResult, webResult, encycResult] = await Promise.all([
      analyzeKeyword(effectiveKeyword),
      getRelatedKeywords(effectiveKeyword),
      searchNews(effectiveKeyword, 5).catch(() => null),
      searchWeb(effectiveKeyword, 3).catch(() => null),
      searchEncyclopedia(effectiveKeyword, 3).catch(() => null),
    ]);
    await recordUsage(user.userId, "search", effectiveKeyword);
    // Save search history (non-blocking), enforce plan-based history limit
    const planLimits = PLAN_LIMITS[user.plan];
    const historyLimit = planLimits.historyLimit;
    (async () => {
      try {
        await saveSearchHistory(user.userId, analysis);
        // Trim old entries if over limit
        if (historyLimit !== -1) {
          const { createServerClient } = await import("@/shared/lib/supabase");
          const supabase = await createServerClient();
          const { count } = await supabase
            .from("keyword_searches")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.userId);
          if ((count ?? 0) > historyLimit) {
            const { data: oldest } = await supabase
              .from("keyword_searches")
              .select("id")
              .eq("user_id", user.userId)
              .order("created_at", { ascending: true })
              .limit((count ?? 0) - historyLimit);
            if (oldest && oldest.length > 0) {
              await supabase
                .from("keyword_searches")
                .delete()
                .in("id", oldest.map((r) => r.id));
            }
          }
        }
      } catch (err) {
        console.error("[analyze] saveSearchHistory failed:", err instanceof Error ? err.message : err);
      }
    })();

    // Encyclopedia wall detection: if encyclopedia results exist, blog SEO is harder
    const hasEncycWall = (encycResult?.total ?? 0) > 0;

    // Apply plan-based restrictions
    const filteredAnalysis = {
      ...analysis,
      topPosts: analysis.topPosts
        ? analysis.topPosts.slice(0, planLimits.topPostsLimit)
        : null,
      sectionData: planLimits.sectionAnalysisEnabled ? analysis.sectionData : null,
    };

    return Response.json({
      analysis: filteredAnalysis,
      relatedKeywords,
      correctedKeyword,
      news: newsResult ? { items: newsResult.items, total: newsResult.total } : null,
      webDocuments: webResult ? { items: webResult.items, total: webResult.total } : null,
      encyclopediaWall: hasEncycWall,
      encyclopediaCount: encycResult?.total ?? 0,
      plan: user.plan,
    });
  } catch (err) {
    console.error("[api/analyze] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
