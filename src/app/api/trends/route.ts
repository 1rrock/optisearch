import { z } from "zod";
import { getKeywordTrend } from "@/services/trend-service";

const bodySchema = z.object({
  keywords: z.array(z.string().min(1)).min(1).max(5),
  months: z.number().min(1).max(24).optional().default(12),
  device: z.enum(["pc", "mo"]).optional(),
  gender: z.enum(["m", "f"]).optional(),
  ages: z.array(z.string()).optional(),
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
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const { keywords, months, device, gender, ages } = parsed.data;
    const trends = await getKeywordTrend(keywords, months, device, gender, ages);
    return Response.json({ trends });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
