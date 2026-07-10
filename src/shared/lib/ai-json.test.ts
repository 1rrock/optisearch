import { describe, it, expect } from "vitest";
import { parseAiJson } from "./ai-json";

describe("parseAiJson", () => {
  it("정상 JSON을 그대로 파싱한다", () => {
    expect(parseAiJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("Gemini가 덧붙이는 여분의 닫는 중괄호를 무시한다", () => {
    // 실측된 실패 케이스: json_object 모드인데도 끝에 "}" 가 하나 더 붙어 온다.
    expect(parseAiJson('{"suggestedTitle":"제목","tags":["a"]}\n}')).toEqual({
      suggestedTitle: "제목",
      tags: ["a"],
    });
  });

  it("```json 코드펜스로 감싸도 파싱한다", () => {
    expect(parseAiJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("본문 문자열 안의 중괄호에 속지 않는다", () => {
    const raw = '{"content":"함수는 { 이렇게 } 씁니다","n":2}';
    expect(parseAiJson(raw)).toEqual({ content: "함수는 { 이렇게 } 씁니다", n: 2 });
  });

  it("이스케이프된 따옴표가 있어도 잘리지 않는다", () => {
    const raw = '{"content":"그는 \\"안녕\\" 이라 했다 }","n":1}\n}';
    expect(parseAiJson(raw)).toEqual({ content: '그는 "안녕" 이라 했다 }', n: 1 });
  });

  it("JSON 객체가 없으면 던진다", () => {
    expect(() => parseAiJson("죄송합니다, 답변할 수 없습니다.")).toThrow();
  });

  it("중괄호 짝이 맞지 않으면 던진다", () => {
    expect(() => parseAiJson('{"a":1')).toThrow();
  });
});
