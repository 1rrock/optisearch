import { z } from "zod";
import { analyzeKeyword } from "@/services/keyword-service";
import { correctTypo } from "@/shared/lib/naver-search";
import { checkPublicRateLimit, getClientIp } from "@/shared/lib/public-rate-limit";
import { verifyTurnstileToken } from "@/shared/lib/turnstile";

const bodySchema = z.object({
  keyword: z.string().min(1).max(50),
  turnstileToken: z.string().min(1),
});

const DAILY_LIMIT = 5;

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

  // 4. Verify Turnstile token
  const valid = await verifyTurnstileToken(turnstileToken);
  if (!valid) {
    return Response.json(
      { error: "CAPTCHA 검증에 실패했습니다.", code: "CAPTCHA_FAILED" },
      { status: 403 }
    );
  }

  // 5. Analyse via the same service the authenticated path uses.
  //
  // 등급 계산식만 공유해서는 부족했다. 두 가지가 더 달랐다.
  //   (a) keyword-service 는 네이버가 검열한 검색량을 keyword_corpus/블로그
  //       비율로 역추정한다(keyword-service.ts:197). 이 라우트가 SearchAd
  //       원본값을 쓰면 같은 함수에 다른 숫자가 들어간다.
  //   (b) 인증 경로는 오타를 교정한다. "경추배게"(검색량 5,530)를 교정하면
  //       "경추 베개"(33,801)가 되어 등급 자체가 달라진다.
  // 무료 도구에서 본 등급이 가입 후 강등되면 안 된다. 같은 입력, 같은 경로.
  try {
    const correction = await correctTypo(keyword).catch(() => null);
    const effectiveKeyword = correction?.errata || keyword;
    const analysis = await analyzeKeyword(effectiveKeyword);

    return Response.json({
      keyword: analysis.keyword,
      correctedFrom: effectiveKeyword !== keyword ? keyword : undefined,
      totalSearchVolume: analysis.totalSearchVolume,
      pcSearchVolume: analysis.pcSearchVolume,
      mobileSearchVolume: analysis.mobileSearchVolume,
      competition: analysis.competition,
      keywordGrade: analysis.keywordGrade,
      remaining: rateLimit.remaining,
      limit: DAILY_LIMIT,
    });
  } catch (err) {
    console.error("[api/public/analyze] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
