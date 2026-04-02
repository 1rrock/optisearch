import { z } from "zod";
import { getShoppingTrend, getShoppingKeywordTrend } from "@/shared/lib/naver-datalab";
import { getAuthenticatedUser, enforceUsageLimit, recordUsage } from "@/shared/lib/api-helpers";
import { PLAN_LIMITS } from "@/shared/config/constants";

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

    const params: any = {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      timeUnit: "month",
      category,
      device,
      gender,
      ages,
    };

    if (keyword) {
      params.keyword = keyword;
      const result = await getShoppingKeywordTrend(params);
      await recordUsage(user.userId, "search", keyword);
      return Response.json(result);
    } else {
      const result = await getShoppingTrend(params);
      await recordUsage(user.userId, "search", category);
      return Response.json(result);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
