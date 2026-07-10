import OpenAI from "openai";

// Singleton OpenAI client — survives hot reload in dev
const globalForOpenAI = globalThis as unknown as { __openai?: OpenAI };

// Model id for whichever provider OPENAI_BASE_URL points at.
// Must be set together with OPENAI_BASE_URL — a Gemini endpoint rejects "gpt-4o-mini".
export const AI_MODEL = process.env.AI_MODEL ?? "gpt-4o-mini";

export function getOpenAIClient(): OpenAI {
  if (!globalForOpenAI.__openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing OPENAI_API_KEY environment variable");
    }
    // Optional: point the OpenAI-compatible client at another provider
    // (e.g. Google Gemini's OpenAI-compat endpoint) by setting OPENAI_BASE_URL.
    // Unset → defaults to the real OpenAI API.
    const baseURL = process.env.OPENAI_BASE_URL || undefined;
    globalForOpenAI.__openai = new OpenAI({ apiKey, baseURL });
  }
  return globalForOpenAI.__openai;
}
