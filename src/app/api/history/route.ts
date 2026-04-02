import { getCurrentUserProfileId } from "@/services/user-service";
import { getSearchHistory, saveSearchHistory } from "@/services/history-service";
import { z } from "zod";

export async function GET() {
  try {
    const userId = await getCurrentUserProfileId();
    if (!userId) {
      return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const history = await getSearchHistory(userId);
    return Response.json({ history });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}

const saveSchema = z.object({
  result: z.object({
    keyword: z.string(),
    pcSearchVolume: z.number(),
    mobileSearchVolume: z.number(),
    totalSearchVolume: z.number(),
    competition: z.string(),
    clickRate: z.number(),
    blogPostCount: z.number(),
    saturationIndex: z.object({
      value: z.number(),
      label: z.string(),
      score: z.number(),
    }),
    keywordGrade: z.string(),
    sectionData: z.any().nullable(),
    topPosts: z.any().nullable(),
    shoppingData: z.any().nullable(),
    createdAt: z.string(),
  }),
});

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserProfileId();
    if (!userId) {
      return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }

    await saveSearchHistory(userId, parsed.data.result as any);
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
