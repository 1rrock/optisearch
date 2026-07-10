/**
 * LLM이 돌려준 텍스트에서 첫 번째 JSON 객체만 안전하게 뽑아 파싱한다.
 *
 * `response_format: { type: "json_object" }`를 켜도 Gemini는 가끔 닫는 중괄호를
 * 하나 더 붙이거나 ```json 펜스로 감싸서 보낸다. 프롬프트가 길수록(엔리치먼트가
 * 붙을수록) 빈도가 올라간다. 실측: 엔리치먼트 없는 프롬프트 0/10, 있는 프롬프트 2/10.
 * 그대로 JSON.parse 하면 사용자에게 "AI 응답 형식 오류"가 뜬다.
 *
 * 중괄호 깊이를 셀 때 문자열 리터럴 내부는 건너뛴다. 본문(content)에 `{`가 들어
 * 있어도 잘리지 않게 하기 위함이다.
 */
export function parseAiJson<T = unknown>(raw: string): T {
  const text = stripCodeFence(raw).trim();

  // 정상적인 경우가 대부분이므로 먼저 그대로 시도한다.
  try {
    return JSON.parse(text) as T;
  } catch {
    // 아래에서 첫 객체만 잘라 재시도
  }

  const slice = extractFirstJsonObject(text);
  if (slice === null) {
    throw new SyntaxError("응답에서 JSON 객체를 찾지 못했습니다.");
  }
  return JSON.parse(slice) as T;
}

function stripCodeFence(raw: string): string {
  const fenced = raw.match(/^\s*```(?:json)?\s*\n([\s\S]*?)\n?\s*```\s*$/);
  return fenced ? fenced[1] : raw;
}

/** 첫 `{`부터 짝이 맞는 `}`까지를 반환한다. 짝을 못 찾으면 null. */
function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}
