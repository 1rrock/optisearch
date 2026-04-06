import { z } from "zod";
import { getRelatedKeywords } from "@/services/keyword-service";
import { searchNews, searchWeb, searchEncyclopedia } from "@/shared/lib/naver-search";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";

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

  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const [relatedKeywords, newsResult, webResult, encycResult] = await Promise.all([
      getRelatedKeywords(keyword),
      searchNews(keyword, 5).catch(() => null),
      searchWeb(keyword, 3).catch(() => null),
      searchEncyclopedia(keyword, 3).catch(() => null),
    ]);

    const hasEncycWall = (encycResult?.total ?? 0) > 0;

    return Response.json({
      relatedKeywords,
      news: newsResult ? { items: newsResult.items, total: newsResult.total } : null,
      webDocuments: webResult ? { items: webResult.items, total: webResult.total } : null,
      encyclopediaWall: hasEncycWall,
      encyclopediaCount: encycResult?.total ?? 0,
    });
  } catch (err) {
    console.error("[api/analyze/extra] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
