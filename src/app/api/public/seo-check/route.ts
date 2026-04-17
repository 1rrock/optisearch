import { z } from "zod";
import { checkPublicRateLimit, getClientIp } from "@/shared/lib/public-rate-limit";
import { verifyTurnstileToken } from "@/shared/lib/turnstile";

const bodySchema = z.object({
  title: z.string().min(1).max(200),
  keyword: z.string().min(1).max(50),
  content: z.string().max(20000).optional().default(""),
  turnstileToken: z.string().optional(),
});

const DAILY_LIMIT = 5;

// ---------------------------------------------------------------------------
// SEO 점수 계산 로직
// ---------------------------------------------------------------------------

interface SeoCheckResult {
  score: number;
  grade: "A" | "B" | "C" | "D";
  checks: {
    label: string;
    passed: boolean;
    detail: string;
  }[];
}

function calculateSeoScore(
  title: string,
  keyword: string,
  content: string
): SeoCheckResult {
  const checks: { label: string; passed: boolean; detail: string }[] = [];
  let score = 0;

  // 1. 제목 길이 (30-60자가 이상적)
  const titleLen = title.length;
  const titleOk = titleLen >= 30 && titleLen <= 60;
  checks.push({
    label: "제목 길이",
    passed: titleOk,
    detail: titleOk ? `${titleLen}자 (적정)` : `${titleLen}자 (30-60자 권장)`,
  });
  if (titleOk) score += 35;
  else if (titleLen >= 20 && titleLen <= 70) score += 20;

  // 2. 제목에 키워드 포함 여부
  const titleHasKeyword = title.toLowerCase().includes(keyword.toLowerCase());
  checks.push({
    label: "제목 키워드 포함",
    passed: titleHasKeyword,
    detail: titleHasKeyword ? "키워드가 제목에 포함됨" : "키워드가 제목에 없음",
  });
  if (titleHasKeyword) score += 35;

  // 3. 본문 길이 (제공되었을 때만, 1000자 이상이 이상적)
  if (content.length > 0) {
    const contentOk = content.length >= 1000;
    checks.push({
      label: "본문 길이",
      passed: contentOk,
      detail: contentOk
        ? `${content.length}자 (적정)`
        : `${content.length}자 (1,000자 이상 권장)`,
    });
    if (contentOk) score += 30;
    else if (content.length >= 500) score += 15;
  } else {
    // 본문 없으면 나머지 30점은 제목/키워드 관련으로 분배
    checks.push({
      label: "본문 길이",
      passed: false,
      detail: "본문이 입력되지 않음",
    });
  }

  // 등급 결정
  let grade: "A" | "B" | "C" | "D";
  if (score >= 85) grade = "A";
  else if (score >= 65) grade = "B";
  else if (score >= 40) grade = "C";
  else grade = "D";

  return { score, grade, checks };
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

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
      { error: "입력값이 유효하지 않습니다.", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { title, keyword, content, turnstileToken } = parsed.data;

  // 3. Extract IP and check rate limit
  const ip = getClientIp(request);
  const rateLimit = await checkPublicRateLimit(ip, "seo-check", DAILY_LIMIT);

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

  // 5. Calculate SEO score
  try {
    const result = calculateSeoScore(title, keyword, content);

    return Response.json({
      score: result.score,
      grade: result.grade,
      checks: result.checks,
      remaining: rateLimit.remaining,
      limit: DAILY_LIMIT,
    });
  } catch (err) {
    console.error("[api/public/seo-check] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
