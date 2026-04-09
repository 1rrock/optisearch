import { z } from "zod";
import { getRelatedKeywords } from "@/services/keyword-service";
import { searchNews, searchWeb, searchEncyclopedia } from "@/shared/lib/naver-search";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { checkRateLimit } from "@/shared/lib/rate-limit";
import { checkUsageLimit, recordAndEnforce } from "@/services/usage-service";
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

  const rl = await checkRateLimit(user.userId);
  if (!rl.allowed) {
    return Response.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  // Early quota pre-check before expensive AI work
  const preCheck = await checkUsageLimit(user.userId, user.plan, "search");
  if (!preCheck.allowed) {
    return Response.json(
      { error: `일일 사용 한도를 초과했습니다. (${preCheck.used}/${preCheck.limit})`, code: "USAGE_LIMIT_EXCEEDED", used: preCheck.used, limit: preCheck.limit },
      { status: 429 }
    );
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

    // Record usage after successful work
    const usage = await recordAndEnforce(user.userId, user.plan, "search", keyword);
    if (!usage.allowed) {
      return Response.json(
        { error: `일일 사용 한도를 초과했습니다. (${usage.used}/${usage.limit})`, code: "USAGE_LIMIT_EXCEEDED", used: usage.used, limit: usage.limit },
        { status: 429 }
      );
    }

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
