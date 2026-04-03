import { z } from "zod";
import { getAuthenticatedUser, enforceUsageLimit } from "@/shared/lib/api-helpers";
import {
  getEstimatePerformance,
  getExposureMinimumBid,
  getAveragePositionBid,
} from "@/shared/lib/naver-searchad";
import { cached } from "@/services/cache-service";

const bodySchema = z.object({
  keyword: z.string().min(1),
});

export interface EstimateResponse {
  keyword: string;
  pcEstimate: {
    impressions: number;
    clicks: number;
    avgCpc: number;
    cost: number;
  } | null;
  mobileEstimate: {
    impressions: number;
    clicks: number;
    avgCpc: number;
    cost: number;
  } | null;
  minimumBid: number | null;
  positionBids: Array<{ position: number; bid: number }>;
}

// 24-hour cache — CPC data changes slowly
const ESTIMATE_TTL = 24 * 60 * 60 * 1000;

/**
 * POST /api/keywords/estimate
 *
 * Returns estimated CPC, bid prices, and ad performance for a keyword.
 * Data from Naver SearchAd Estimate API (no daily quota limit).
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

  const limitError = await enforceUsageLimit(user.userId, user.plan, "search");
  if (limitError) return limitError;

  try {
    const { keyword } = parsed.data;

    const result = await cached<EstimateResponse>(
      `estimate:${keyword}`,
      ESTIMATE_TTL,
      async () => {
        const [pcEst, mobileEst, minBid, posBids] = await Promise.all([
          getEstimatePerformance(keyword, "PC"),
          getEstimatePerformance(keyword, "MOBILE"),
          getExposureMinimumBid(keyword),
          getAveragePositionBid(keyword),
        ]);

        return {
          keyword,
          pcEstimate: pcEst
            ? { impressions: pcEst.impressions, clicks: pcEst.clicks, avgCpc: pcEst.avgCpc, cost: pcEst.cost }
            : null,
          mobileEstimate: mobileEst
            ? { impressions: mobileEst.impressions, clicks: mobileEst.clicks, avgCpc: mobileEst.avgCpc, cost: mobileEst.cost }
            : null,
          minimumBid: minBid?.bid ?? null,
          positionBids: posBids.map((p) => ({ position: p.position, bid: p.bid })),
        };
      }
    );

    return Response.json(result);
  } catch (err) {
    console.error("[api/keywords/estimate] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
