import { z } from "zod";
import { analyzeKeywordBatch } from "@/services/keyword-service";

const bodySchema = z.object({
  keywords: z.array(z.string().min(1)).min(1).max(50),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const { keywords } = parsed.data;
    const results = await analyzeKeywordBatch(keywords);
    return Response.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
