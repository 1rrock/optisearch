import { z } from "zod";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { checkRateLimit } from "@/shared/lib/rate-limit";
import {
  createRankSnapshot,
  listRankSnapshots,
} from "@/services/rank-tracking-service";

const postSchema = z.object({
  targetId: z.string().uuid(),
  rank: z.number().int().min(0),
  checkedAt: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const rl = await checkRateLimit(user.userId);
  if (!rl.allowed) {
    return Response.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const targetId = searchParams.get("targetId");
  if (!targetId) {
    return Response.json({ error: "targetId is required" }, { status: 400 });
  }

  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10) || 100, 500);

  try {
    const snapshots = await listRankSnapshots({
      userId: user.userId,
      targetId,
      limit,
    });
    return Response.json({ snapshots });
  } catch (err) {
    console.error("[api/rank] GET error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const rl = await checkRateLimit(user.userId);
  if (!rl.allowed) {
    return Response.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const snapshot = await createRankSnapshot({
      userId: user.userId,
      targetId: parsed.data.targetId,
      rank: parsed.data.rank,
      checkedAt: parsed.data.checkedAt,
    });

    return Response.json({ snapshot }, { status: 201 });
  } catch (err) {
    console.error("[api/rank] POST error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
