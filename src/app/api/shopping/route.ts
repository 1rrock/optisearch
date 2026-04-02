import { z } from "zod";
import { getShoppingTrend, getShoppingKeywordTrend } from "@/shared/lib/naver-datalab";

const bodySchema = z.object({
  category: z.string().min(1),
  keyword: z.string().optional(),
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
    return Response.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const { category, keyword, months, device, gender, ages } = parsed.data;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    const params: any = {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      timeUnit: "month",
      category,
      device,
      gender,
      ages,
    };

    if (keyword) {
      params.keyword = keyword;
      const result = await getShoppingKeywordTrend(params);
      return Response.json(result);
    } else {
      const result = await getShoppingTrend(params);
      return Response.json(result);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
