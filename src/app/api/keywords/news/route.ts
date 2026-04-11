import { z } from "zod";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { checkRateLimit } from "@/shared/lib/rate-limit";
import { searchNews } from "@/shared/lib/naver-search";

const querySchema = z.object({
  keyword: z.string().min(1),
});

/**
 * GET /api/keywords/news?keyword=...
 *
 * Fetches a list of news articles for a specific keyword.
 * Used for the trending keywords preview section.
 */
export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword");

  const parsed = querySchema.safeParse({ keyword });
  if (!parsed.success) {
    return Response.json({ error: "검색어가 필요합니다." }, { status: 422 });
  }

  // Rate limit check
  const rl = await checkRateLimit(user.userId);
  if (!rl.allowed) {
    return Response.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  try {
    // Fetch 8 news items from Naver
    const newsResult = await searchNews(parsed.data.keyword, 8, "date");
    
    return Response.json({
      items: newsResult.items ?? [],
      total: newsResult.total,
    });
  } catch (err) {
    console.error("[api/keywords/news] Error:", err);
    return Response.json({ error: "뉴스를 불러오는 중 오류가 발생했습니다." }, { status: 500 });
  }
}
