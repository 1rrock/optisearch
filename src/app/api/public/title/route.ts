import { z } from "zod";
import { getOpenAIClient } from "@/shared/lib/openai";
import { checkPublicRateLimit, getClientIp } from "@/shared/lib/public-rate-limit";
import { verifyTurnstileToken } from "@/shared/lib/turnstile";
import { sanitizeForPrompt } from "@/shared/lib/sanitize";

const MODEL = "gpt-4o-mini";

const bodySchema = z.object({
  keyword: z.string().min(1).max(50),
  postType: z.enum(["정보성", "리뷰", "리스트형", "비교분석"]).optional().default("정보성"),
  turnstileToken: z.string().optional(),
});

async function generateTitles(keyword: string, postType: string): Promise<string[]> {
  const openai = getOpenAIClient();
  const safeKeyword = sanitizeForPrompt(keyword);
  const safePostType = sanitizeForPrompt(postType, 20);

  const prompt = `다음 키워드로 SEO에 최적화된 블로그 제목 3개를 생성해주세요.
키워드: ${safeKeyword}
글 유형: ${safePostType}

요구사항:
- 각 제목은 30-50자
- 클릭을 유도하는 자연스러운 한국어
- 키워드가 제목에 자연스럽게 포함되어야 함
- 서로 다른 스타일(숫자 포함, 질문형, 혜택 강조 등)로 다양성 확보

JSON 객체 형식으로만 응답: {"titles": ["제목1", "제목2", "제목3"]}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.8,
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    console.error("[api/public/title] Failed to parse AI response:", content.slice(0, 200));
    throw new Error("AI 응답 형식 오류가 발생했습니다. 다시 시도해주세요.");
  }

  const obj = parsed as Record<string, unknown>;
  const titles = Array.isArray(obj)
    ? obj
    : Array.isArray(obj.titles)
      ? obj.titles
      : Array.isArray(obj.result)
        ? obj.result
        : [];

  return (titles as string[]).slice(0, 3);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "입력값이 유효하지 않습니다.", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { keyword, postType, turnstileToken } = parsed.data;

  const ip = getClientIp(request);
  const rateLimit = await checkPublicRateLimit(ip, "title", 3);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "일일 제목 생성 한도(3회)를 초과했습니다. 내일 다시 시도해주세요.", remaining: 0, limit: 3 },
      { status: 429 }
    );
  }

  if (turnstileToken) {
    const valid = await verifyTurnstileToken(turnstileToken);
    if (!valid) {
      return Response.json({ error: "보안 검증에 실패했습니다. 다시 시도해주세요." }, { status: 403 });
    }
  }

  try {
    const titles = await generateTitles(keyword, postType);
    return Response.json({ titles, remaining: rateLimit.remaining, limit: 3 });
  } catch (err) {
    console.error("[api/public/title] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
