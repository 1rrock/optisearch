import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { getSearchHistory, saveSearchHistory, deleteSearchHistory } from "@/services/history-service";
import { z } from "zod";
import { PLAN_LIMITS } from "@/shared/config/constants";
import { checkRateLimit } from "@/shared/lib/rate-limit";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const limits = PLAN_LIMITS[user.plan];
    const fetchLimit = limits.historyLimit === -1 ? 200 : limits.historyLimit;
    const history = await getSearchHistory(user.userId, fetchLimit);
    return Response.json({
      history,
      historyLimit: limits.historyLimit,
      excelEnabled: limits.historyExcelEnabled,
    });
  } catch (err) {
    console.error("[api/history] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
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

export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return Response.json({ error: "id is required" }, { status: 400 });
    }

    await deleteSearchHistory(user.userId, id);
    return Response.json({ success: true });
  } catch (err) {
    console.error("[api/history] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const rateLimitResult = await checkRateLimit(user.userId);
    if (!rateLimitResult.allowed) {
      return Response.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
    }

    const userId = user.userId;

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
    console.error("[api/history] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
