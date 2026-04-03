import { z } from "zod";
import {
  getShoppingDeviceTrend,
  getShoppingGenderTrend,
  getShoppingAgeTrend,
} from "@/shared/lib/naver-datalab";
import { getAuthenticatedUser, enforceUsageLimit, recordUsage } from "@/shared/lib/api-helpers";
import { PLAN_LIMITS } from "@/shared/config/constants";
import { cached } from "@/services/cache-service";
import { formatDate } from "@/shared/lib/utils";

const bodySchema = z.object({
  category: z.string().min(1),
  keyword: z.string().optional(),
  months: z.number().min(1).max(24).optional().default(12),
});

export interface DemographicsResponse {
  category: string;
  keyword?: string;
  device: Array<{ group: string; ratio: number }>;
  gender: Array<{ group: string; ratio: number }>;
  age: Array<{ group: string; ratio: number }>;
}

// 24-hour cache — demographic data changes slowly
const DEMO_TTL = 24 * 60 * 60 * 1000;

/**
 * POST /api/shopping/demographics
 *
 * Returns device/gender/age split for a shopping category or keyword.
 * Uses 3 DataLab API calls (counts toward 1,000/day quota).
 */
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
    const { category, keyword, months } = parsed.data;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const cacheKey = `shopDemo:${category}:${keyword ?? ""}:${months}`;

    const result = await cached<DemographicsResponse>(
      cacheKey,
      DEMO_TTL,
      async () => {
        const params = {
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          timeUnit: "month",
          category,
          keyword,
        };

        const [deviceData, genderData, ageData] = await Promise.all([
          getShoppingDeviceTrend(params),
          getShoppingGenderTrend(params),
          getShoppingAgeTrend(params),
        ]);

        // Extract the latest period's ratios for each dimension
        const extractLatest = (data: typeof deviceData) => {
          if (!data.results?.[0]?.data?.length) return [];
          const allData = data.results[0].data;
          // Get unique groups and their latest ratio
          const groupMap = new Map<string, number>();
          for (const point of allData) {
            groupMap.set(point.group, point.ratio);
          }
          return [...groupMap].map(([group, ratio]) => ({ group, ratio }));
        };

        return {
          category,
          keyword,
          device: extractLatest(deviceData),
          gender: extractLatest(genderData),
          age: extractLatest(ageData),
        };
      }
    );

    await recordUsage(user.userId, "search", keyword ?? category);
    return Response.json(result);
  } catch (err) {
    console.error("[api/shopping/demographics] Error:", err);
    return Response.json({ error: "인구통계 조회 중 오류가 발생했습니다." }, { status: 500 });
  }
}
