import { z } from "zod";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { checkRateLimit } from "@/shared/lib/rate-limit";
import { listNotifications, markNotificationAsRead } from "@/services/notification-service";

const patchSchema = z.object({
  notificationId: z.string().uuid(),
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
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 100);

  try {
    const notifications = await listNotifications({
      userId: user.userId,
      unreadOnly,
      limit,
    });

    return Response.json({ notifications });
  } catch (err) {
    console.error("[api/notifications] GET error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
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

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    await markNotificationAsRead({
      userId: user.userId,
      notificationId: parsed.data.notificationId,
    });
    return Response.json({ success: true });
  } catch (err) {
    console.error("[api/notifications] PATCH error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
