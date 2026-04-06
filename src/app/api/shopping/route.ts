import { z } from "zod";
import { getShoppingTrend, getShoppingKeywordTrend } from "@/shared/lib/naver-datalab";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { PLAN_LIMITS } from "@/shared/config/constants";
import { cached } from "@/services/cache-service";
import { checkRateLimit } from "@/shared/lib/rate-limit";

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

  const rateLimitResult = await checkRateLimit(user.userId);
  if (!rateLimitResult.allowed) {
    return Response.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  if (!PLAN_LIMITS[user.plan].shoppingInsightEnabled) {
    return Response.json(
      { error: "쇼핑 인사이트는 베이직 이상 플랜에서 이용 가능합니다.", code: "PLAN_UPGRADE_REQUIRED" },
      { status: 403 }
    );
  }

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
      const agesKey = ages?.sort().join(",") ?? "";
      const cacheKey = `shop:kw:${category}:${keyword}:${months}:${device ?? ""}:${gender ?? ""}:${agesKey}`;
      const result = await cached(cacheKey, SHOPPING_TTL, () => getShoppingKeywordTrend(keywordParams));
      return Response.json(result);
    } else {
      const agesKey = ages?.sort().join(",") ?? "";
      const cacheKey = `shop:cat:${category}:${months}:${device ?? ""}:${gender ?? ""}:${agesKey}`;
      const result = await cached(cacheKey, SHOPPING_TTL, () => getShoppingTrend(baseParams));
      return Response.json(result);
    }
  } catch (err) {
    console.error("[api/shopping] Error:", err);
    return Response.json({ error: "쇼핑 트렌드 조회 중 오류가 발생했습니다." }, { status: 500 });
  }
}
