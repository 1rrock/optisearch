import { z } from "zod";
import { getSearchTrend } from "@/shared/lib/naver-datalab";
import { checkPublicRateLimit, getClientIp } from "@/shared/lib/public-rate-limit";
import { verifyTurnstileToken } from "@/shared/lib/turnstile";

const bodySchema = z.object({
  keyword: z.string().min(1).max(50),
  turnstileToken: z.string().optional(),
});

const DAILY_LIMIT = 3;

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export async function POST(request: Request) {
  // 1. Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "잘못된 JSON 형식입니다." }, { status: 400 });
  }

  // 2. Validate schema
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "입력값이 올바르지 않습니다.", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { keyword, turnstileToken } = parsed.data;

  // 3. Extract IP and check rate limit
  const ip = getClientIp(request);
  const rateLimit = await checkPublicRateLimit(ip, "trend", DAILY_LIMIT);

  if (!rateLimit.allowed) {
    return Response.json(
      { error: "일일 사용 한도를 초과했습니다.", remaining: 0, limit: DAILY_LIMIT },
      { status: 429 }
    );
  }

  // 4. Verify Turnstile token if provided
  if (turnstileToken) {
    const valid = await verifyTurnstileToken(turnstileToken);
    if (!valid) {
      return Response.json(
        { error: "CAPTCHA 검증에 실패했습니다.", code: "CAPTCHA_FAILED" },
        { status: 403 }
      );
    }
  }

  // 5. Compute 90-day date range (최근 3개월)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);

  // 6. Fetch trend data from Naver DataLab
  try {
    const trendResponse = await getSearchTrend({
      keyword,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      timeUnit: "date",
    });

    const result = trendResponse.results[0];
    const data = (result?.data ?? []).map((point) => ({
      date: point.period,
      ratio: point.ratio,
    }));

    return Response.json({
      keyword,
      period: "3months",
      data,
      remaining: rateLimit.remaining,
      limit: DAILY_LIMIT,
    });
  } catch (err) {
    console.error("[api/public/trend] DataLab error:", err);
    return Response.json(
      { error: "트렌드 데이터를 일시적으로 가져올 수 없습니다." },
      { status: 503 }
    );
  }
}
