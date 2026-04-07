import { z } from "zod";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import {
  getEstimatePerformance,
  getExposureMinimumBid,
  getAveragePositionBid,
} from "@/shared/lib/naver-searchad";
import { cached } from "@/services/cache-service";
import { checkRateLimit } from "@/shared/lib/rate-limit";
import { createErrorResponse } from "@/shared/lib/api-handler";

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
    return createErrorResponse("INVALID_JSON", "Invalid JSON body", 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return createErrorResponse("VALIDATION_FAILED", "Validation failed", 422, parsed.error.flatten());
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return createErrorResponse("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
  }

  const rateLimitResult = await checkRateLimit(user.userId);
  if (!rateLimitResult.allowed) {
    return createErrorResponse("RATE_LIMIT_EXCEEDED", "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.", 429);
  }

  // No usage counting — estimate uses SearchAd API (no daily quota) and
  // is supplementary data. Usage is already counted by /api/analyze.

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
    return createErrorResponse("INTERNAL_ERROR", "서버 오류가 발생했습니다.", 500);
  }
}
