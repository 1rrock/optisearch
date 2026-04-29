import { z } from "zod";
import { getKeywordStats } from "@/shared/lib/naver-searchad";
import { checkPublicRateLimit, getClientIp } from "@/shared/lib/public-rate-limit";
import { verifyTurnstileToken } from "@/shared/lib/turnstile";
import { getOpenAIClient } from "@/shared/lib/openai";

const bodySchema = z.object({
  keyword: z.string().min(1).max(50),
  turnstileToken: z.string().min(1),
});

const DAILY_LIMIT = 1;

interface DemoGptResponse {
  interpretation: string;
  titles: string[];
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

  // 3. Verify Turnstile token (required for demo)
  const valid = await verifyTurnstileToken(turnstileToken);
  if (!valid) {
    return Response.json(
      { error: "CAPTCHA 검증에 실패했습니다.", code: "CAPTCHA_FAILED" },
      { status: 403 }
    );
  }

  // 4. Check rate limit — 1 per session (IP-based daily)
  const ip = getClientIp(request);
  const rateLimit = await checkPublicRateLimit(ip, "demo", DAILY_LIMIT);
  if (!rateLimit.allowed) {
    return Response.json(
      {
        error: "체험은 1회만 가능합니다. 무료 가입하면 일 3회까지 사용할 수 있어요.",
        remaining: 0,
        limit: DAILY_LIMIT,
      },
      { status: 429 }
    );
  }

  // 5. Fetch keyword stats and generate GPT analysis
  try {
    const stats = await getKeywordStats([keyword]);
    const stat =
      stats.find((s) => s.relKeyword.toLowerCase() === keyword.toLowerCase()) ??
      stats[0];

    const pcSearchVolume = stat?.monthlyPcQcCnt ?? 0;
    const mobileSearchVolume = stat?.monthlyMobileQcCnt ?? 0;
    const totalSearchVolume = pcSearchVolume + mobileSearchVolume;
    const competition = (stat?.compIdx ?? "중간") as "낮음" | "중간" | "높음";

    // 콘텐츠 포화 지수: 소수점 4자리
    const saturation = parseFloat(Math.min(1, totalSearchVolume / 50000).toFixed(4));

    // GPT-4o-mini: 해석 + 제목 3개 (JSON 모드)
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "당신은 한국 블로그 SEO 전문가입니다. 블로그 입문 1년차 부업러를 돕는 친근한 톤으로 답변합니다.",
        },
        {
          role: "user",
          content: `다음 키워드 데이터를 분석하고 JSON으로 응답해주세요.

키워드: ${keyword}
PC 검색량: ${pcSearchVolume.toLocaleString()}회/월
모바일 검색량: ${mobileSearchVolume.toLocaleString()}회/월
경쟁도: ${competition}
콘텐츠 포화 지수: ${saturation} (0=여유, 1=포화)

응답 형식:
{
  "interpretation": "이 키워드는 ___예요. ___부터 노려보세요. (2~3문장 자연어, 친근한 톤)",
  "titles": ["블로그 제목1", "블로그 제목2", "블로그 제목3"]
}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let gpt: DemoGptResponse;
    try {
      gpt = JSON.parse(raw) as DemoGptResponse;
    } catch {
      gpt = { interpretation: "", titles: [] };
    }

    return Response.json({
      keyword,
      pcSearchVolume,
      mobileSearchVolume,
      totalSearchVolume,
      competition,
      saturation,
      interpretation: gpt.interpretation ?? "",
      titles: Array.isArray(gpt.titles) ? gpt.titles.slice(0, 3) : [],
    });
  } catch (err) {
    console.error("[api/public/demo] Error:", err);
    return Response.json(
      { error: "분석 중 문제가 발생했어요. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
