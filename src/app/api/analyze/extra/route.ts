import { z } from "zod";
import { getRelatedKeywords } from "@/services/keyword-service";
import { searchNews, searchWeb, searchEncyclopedia } from "@/shared/lib/naver-search";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { classifyIntent, suggestStrategy, clusterKeywords } from "@/services/ai-service";

const bodySchema = z.object({
  keyword: z.string().min(1),
  analysisContext: z
    .object({
      totalSearchVolume: z.number().optional(),
      competition: z.string().optional(),
      saturationLabel: z.string().optional(),
      saturationScore: z.number().optional(),
      clickRate: z.number().optional(),
    })
    .optional(),
});

/**
 * Analyze top post title/description specs from search API response metadata.
 * No crawling — uses only API-provided data.
 */
function analyzeTopPostSpecs(
  items: Array<{ title: string; description: string }>
): { avgTitleLength: number; avgDescLength: number; count: number } | null {
  if (!items.length) return null;
  const avgTitleLength = Math.round(
    items.reduce((s, it) => s + it.title.replace(/<[^>]*>/g, "").length, 0) / items.length
  );
  const avgDescLength = Math.round(
    items.reduce((s, it) => s + it.description.replace(/<[^>]*>/g, "").length, 0) / items.length
  );
  return { avgTitleLength, avgDescLength, count: items.length };
}

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

  const { keyword, analysisContext } = parsed.data;

  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    // Core data (always fetched)
    const [relatedKeywords, newsResult, webResult, encycResult] = await Promise.all([
      getRelatedKeywords(keyword),
      searchNews(keyword, 5).catch(() => null),
      searchWeb(keyword, 3).catch(() => null),
      searchEncyclopedia(keyword, 3).catch(() => null),
    ]);

    const hasEncycWall = (encycResult?.total ?? 0) > 0;

    // Top post spec analysis (from web search results — no crawling)
    const blogItems = webResult?.items ?? [];
    const contentSpec = analyzeTopPostSpecs(blogItems);

    // AI features (fire in parallel, catch individually)
    const topTitles = blogItems.map((it) => it.title.replace(/<[^>]*>/g, ""));
    const relKeywordStrings = relatedKeywords.map((rk) => rk.keyword);

    const [intentResult, strategyResult, clusterResult] = await Promise.allSettled([
      classifyIntent(keyword, topTitles),
      analysisContext?.totalSearchVolume != null
        ? suggestStrategy({
            keyword,
            totalSearchVolume: analysisContext.totalSearchVolume,
            competition: analysisContext.competition ?? "중간",
            saturationLabel: analysisContext.saturationLabel ?? "보통",
            saturationScore: analysisContext.saturationScore ?? 50,
            clickRate: analysisContext.clickRate ?? 0,
          })
        : Promise.resolve(null),
      clusterKeywords(keyword, relKeywordStrings),
    ]);

    return Response.json({
      relatedKeywords,
      news: newsResult ? { items: newsResult.items, total: newsResult.total } : null,
      webDocuments: webResult ? { items: webResult.items, total: webResult.total } : null,
      encyclopediaWall: hasEncycWall,
      encyclopediaCount: encycResult?.total ?? 0,
      contentSpec,
      intent: intentResult.status === "fulfilled" ? intentResult.value : null,
      strategy: strategyResult.status === "fulfilled" ? strategyResult.value : null,
      clusters: clusterResult.status === "fulfilled" ? clusterResult.value : null,
    });
  } catch (err) {
    console.error("[api/analyze/extra] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
