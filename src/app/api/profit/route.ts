import { z } from "zod";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { createErrorResponse } from "@/shared/lib/api-handler";
import { checkRateLimit } from "@/shared/lib/rate-limit";
import { scoreProfitability } from "@/services/profit-scoring-service";

const bodySchema = z.object({
  keyword: z.string().min(1),
  searchVolume: z.coerce.number().int().min(0),
  expectedClicks: z.coerce.number().int().min(0),
  competition: z.enum(["LOW", "MEDIUM", "HIGH", "낮음", "중간", "높음"]),
  conversionRate: z.coerce.number().min(0).max(1).optional().default(0.02),
  avgCpc: z.coerce.number().int().min(0).optional(),
  avgOrderValue: z.coerce.number().int().min(0).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("INVALID_JSON", "Invalid JSON body", 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return createErrorResponse("VALIDATION_FAILED", "Validation failed", 422, { issues: parsed.error.issues });
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return createErrorResponse("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
  }

  const rateLimitResult = await checkRateLimit(user.userId);
  if (!rateLimitResult.allowed) {
    return createErrorResponse(
      "RATE_LIMIT_EXCEEDED",
      "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
      429,
      undefined,
      {
        headers: {
          "Retry-After": "60",
          "X-RateLimit-Remaining": String(rateLimitResult.remaining),
        },
      }
    );
  }

  // Map Korean competition labels to English for profit-scoring-service
  const competitionMap = {
    "낮음": "LOW",
    "중간": "MEDIUM",
    "높음": "HIGH",
    "LOW": "LOW",
    "MEDIUM": "MEDIUM",
    "HIGH": "HIGH",
  } as const;
  const competitionEn = competitionMap[parsed.data.competition as keyof typeof competitionMap] ?? "HIGH";

  const scoring = scoreProfitability({
    ...parsed.data,
    competition: competitionEn,
    avgCpc: parsed.data.avgCpc,
    avgOrderValue: parsed.data.avgOrderValue,
  });

  return Response.json({
    ...scoring,
  });
}
