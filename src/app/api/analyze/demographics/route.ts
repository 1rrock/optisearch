import { z } from "zod";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { PLAN_LIMITS } from "@/shared/config/constants";
import { checkRateLimit } from "@/shared/lib/rate-limit";
import { getSearchTrend } from "@/shared/lib/naver-datalab";
import { cached, CacheTTL } from "@/services/cache-service";

const bodySchema = z.object({
  keyword: z.string().min(1),
});

/** Age group labels (DataLab ages parameter) */
const AGE_GROUPS = [
  { ids: ["1", "2"], label: "10대 이하" },
  { ids: ["3", "4"], label: "20대" },
  { ids: ["5", "6"], label: "30대" },
  { ids: ["7", "8"], label: "40대" },
  { ids: ["9", "10", "11"], label: "50대 이상" },
] as const;

interface DemoRatio {
  group: string;
  ratio: number;
}

/**
 * POST /api/analyze/demographics
 *
 * On-demand search keyword demographics (gender, device, age).
 * Uses DataLab /search endpoint with demographic filters.
 * Cost: 9 DataLab calls per keyword (gender 2 + device 2 + age 5).
 * Cached 24 hours.
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

  const limits = PLAN_LIMITS[user.plan];
  if (!limits.demographicsEnabled) {
    return Response.json(
      { error: "인구통계 분석은 베이직/프로 플랜에서 사용할 수 있습니다.", code: "PLAN_REQUIRED" },
      { status: 403 }
    );
  }

  const rateLimitResult = await checkRateLimit(user.userId);
  if (!rateLimitResult.allowed) {
    return Response.json({ error: "요청이 너무 많습니다." }, { status: 429 });
  }

  try {
    const result = await cached(
      `demo:search:${keyword.toLowerCase()}`,
      CacheTTL.KEYWORD,
      () => fetchSearchDemographics(keyword)
    );

    return Response.json(result);
  } catch (err) {
    console.error("[api/analyze/demographics] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

async function fetchSearchDemographics(keyword: string) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const start = fmt(startDate);
  const end = fmt(endDate);

  const baseParams = {
    keyword,
    startDate: start,
    endDate: end,
    timeUnit: "month" as const,
  };

  // Fire all demographic queries in parallel (7 total)
  // NOTE: Gender is intentionally omitted. Naver DataLab /search with gender:"m" / gender:"f"
  // returns independently-normalized relative indices (0–100 within each gender's own universe),
  // NOT comparable cross-gender shares. Dividing them always produces ~50:50 regardless of the
  // actual demographic split (e.g. "브래지어" shows 50:50 instead of ~90% female).
  // Accurate gender share requires the Shopping Insight /keyword/gender endpoint which needs a
  // category code — not available for general search keywords.
  const [
    pcRes, moRes,
    ...ageResults
  ] = await Promise.allSettled([
    // Device (2 calls)
    getSearchTrend({ ...baseParams, device: "pc" }),
    getSearchTrend({ ...baseParams, device: "mo" }),
    // Age groups (5 calls — merged groups)
    ...AGE_GROUPS.map((ag) =>
      getSearchTrend({ ...baseParams, ages: [...ag.ids] })
    ),
  ]);

  const extractRatio = (res: PromiseSettledResult<Awaited<ReturnType<typeof getSearchTrend>>>) => {
    if (res.status !== "fulfilled") return 0;
    const data = res.value.results?.[0]?.data;
    if (!data?.length) return 0;
    return data[data.length - 1].ratio;
  };

  // Gender — not available for search keywords (see comment above)
  const gender: DemoRatio[] = [];

  // Device
  const pcRatio = extractRatio(pcRes);
  const moRatio = extractRatio(moRes);
  const deviceTotal = pcRatio + moRatio;
  const device: DemoRatio[] = deviceTotal > 0
    ? [
        { group: "PC", ratio: Math.round((pcRatio / deviceTotal) * 100) },
        { group: "모바일", ratio: Math.round((moRatio / deviceTotal) * 100) },
      ]
    : [];

  // Age
  const ageRatios = AGE_GROUPS.map((ag, i) => ({
    group: ag.label,
    rawRatio: extractRatio(ageResults[i]),
  }));
  const ageTotal = ageRatios.reduce((s, a) => s + a.rawRatio, 0);
  const age: DemoRatio[] = ageTotal > 0
    ? ageRatios.map((a) => ({
        group: a.group,
        ratio: Math.round((a.rawRatio / ageTotal) * 100),
      }))
    : [];

  return { keyword, gender, device, age };
}
