import { z } from "zod";
import { getKeywordStats } from "@/shared/lib/naver-searchad";
import { checkPublicRateLimit, getClientIp } from "@/shared/lib/public-rate-limit";
import { verifyTurnstileToken } from "@/shared/lib/turnstile";
import { gradeFromScore } from "@/shared/config/constants";
import type { KeywordGrade } from "@/shared/model/keyword-grade";

const bodySchema = z.object({
  keyword: z.string().min(1).max(50),
  turnstileToken: z.string().optional(),
});

const DAILY_LIMIT = 5;

function calculateGrade(
  totalVolume: number,
  competition: "낮음" | "중간" | "높음"
): KeywordGrade {
  // 검색량 점수 (0-60)
  const volumeScore = Math.min(60, Math.log10(Math.max(totalVolume, 1)) * 12);
  // 경쟁도 점수 (0-40)
  const compScore = competition === "낮음" ? 40 : competition === "중간" ? 25 : 10;
  return gradeFromScore(volumeScore + compScore);
}

export async function POST(request: Request) {
  // 1. Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 2. Validate schema
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { keyword, turnstileToken } = parsed.data;

  // 3. Extract IP and check rate limit
  const ip = getClientIp(request);
  const rateLimit = await checkPublicRateLimit(ip, "analyze", DAILY_LIMIT);

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

  // 5. Fetch keyword stats
  try {
    const stats = await getKeywordStats([keyword]);
    const stat =
      stats.find((s) => s.relKeyword.toLowerCase() === keyword.toLowerCase()) ??
      stats[0];

    const pcSearchVolume = stat?.monthlyPcQcCnt ?? 0;
    const mobileSearchVolume = stat?.monthlyMobileQcCnt ?? 0;
    const totalSearchVolume = pcSearchVolume + mobileSearchVolume;
    const competition = (stat?.compIdx ?? "중간") as "낮음" | "중간" | "높음";
    const keywordGrade = calculateGrade(totalSearchVolume, competition);

    return Response.json({
      keyword,
      totalSearchVolume,
      pcSearchVolume,
      mobileSearchVolume,
      competition,
      keywordGrade,
      remaining: rateLimit.remaining,
      limit: DAILY_LIMIT,
    });
  } catch (err) {
    console.error("[api/public/analyze] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
