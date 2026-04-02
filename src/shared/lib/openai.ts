import OpenAI from "openai";

// Singleton OpenAI client — survives hot reload in dev
const globalForOpenAI = globalThis as unknown as { __openai?: OpenAI };

export function getOpenAIClient(): OpenAI {
  if (!globalForOpenAI.__openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing OPENAI_API_KEY environment variable");
    }
    globalForOpenAI.__openai = new OpenAI({ apiKey });
  }
  return globalForOpenAI.__openai;
}
