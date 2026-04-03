import { z } from "zod";
import { analyzeKeyword, getRelatedKeywords } from "@/services/keyword-service";
import { checkAdult, correctTypo, searchNews, searchWeb, searchEncyclopedia } from "@/shared/lib/naver-search";
import { getAuthenticatedUser, enforceUsageLimit, recordUsage } from "@/shared/lib/api-helpers";
import { saveSearchHistory } from "@/services/history-service";

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

    const [analysis, relatedKeywords, newsResult, webResult, encycResult] = await Promise.all([
      analyzeKeyword(effectiveKeyword),
      getRelatedKeywords(effectiveKeyword),
      searchNews(effectiveKeyword, 5).catch(() => null),
      searchWeb(effectiveKeyword, 3).catch(() => null),
      searchEncyclopedia(effectiveKeyword, 3).catch(() => null),
    ]);
    await recordUsage(user.userId, "search", effectiveKeyword);
    // Save search history (non-blocking)
    saveSearchHistory(user.userId, analysis).catch((err) => {
      console.error("[analyze] saveSearchHistory failed:", err?.message ?? err);
    });

    // Encyclopedia wall detection: if encyclopedia results exist, blog SEO is harder
    const hasEncycWall = (encycResult?.total ?? 0) > 0;

    return Response.json({
      analysis,
      relatedKeywords,
      correctedKeyword,
      news: newsResult ? { items: newsResult.items, total: newsResult.total } : null,
      webDocuments: webResult ? { items: webResult.items, total: webResult.total } : null,
      encyclopediaWall: hasEncycWall,
      encyclopediaCount: encycResult?.total ?? 0,
    });
  } catch (err) {
    console.error("[api/analyze] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
