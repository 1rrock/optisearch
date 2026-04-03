import { z } from "zod";
import { getShoppingTrend, getShoppingKeywordTrend } from "@/shared/lib/naver-datalab";
import { getAuthenticatedUser, enforceUsageLimit, recordUsage } from "@/shared/lib/api-helpers";
import { PLAN_LIMITS } from "@/shared/config/constants";
import { cached } from "@/services/cache-service";

const bodySchema = z.object({
  category: z.string().min(1),
  keyword: z.string().optional(),
  months: z.number().min(1).max(24).optional().default(12),
  device: z.enum(["pc", "mo"]).optional(),
  gender: z.enum(["m", "f"]).optional(),
  ages: z.array(z.string()).optional(),
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
    return Response.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!PLAN_LIMITS[user.plan].shoppingInsightEnabled) {
    return Response.json(
      { error: "쇼핑 인사이트는 베이직 이상 플랜에서 이용 가능합니다.", code: "PLAN_UPGRADE_REQUIRED" },
      { status: 403 }
    );
  }

  const limitError = await enforceUsageLimit(user.userId, user.plan, "search");
  if (limitError) return limitError;

  try {
    const { category, keyword, months, device, gender, ages } = parsed.data;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    const baseParams = {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      timeUnit: "month",
      category,
      device,
      gender,
      ages,
    };

    const SHOPPING_TTL = 6 * 60 * 60 * 1000; // 6시간

    if (keyword) {
      const keywordParams = { ...baseParams, keyword };
      const cacheKey = `shop:kw:${category}:${keyword}:${months}:${device ?? ""}:${gender ?? ""}`;
      const result = await cached(cacheKey, SHOPPING_TTL, () => getShoppingKeywordTrend(keywordParams));
      await recordUsage(user.userId, "search", keyword);
      return Response.json(result);
    } else {
      const cacheKey = `shop:cat:${category}:${months}:${device ?? ""}:${gender ?? ""}`;
      const result = await cached(cacheKey, SHOPPING_TTL, () => getShoppingTrend(baseParams));
      await recordUsage(user.userId, "search", category);
      return Response.json(result);
    }
  } catch (err) {
    console.error("[api/shopping] Error:", err);
    return Response.json({ error: "쇼핑 트렌드 조회 중 오류가 발생했습니다." }, { status: 500 });
  }
}
