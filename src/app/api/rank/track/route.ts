import { z } from "zod";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { checkRateLimit } from "@/shared/lib/rate-limit";
import {
  createOrUpdateRankTrackTarget,
  listRankTrackTargets,
  setRankTrackTargetActive,
  deleteRankTrackTarget,
} from "@/services/rank-tracking-service";
import { PLAN_LIMITS } from "@/shared/config/constants";
import { createServerClient } from "@/shared/lib/supabase";

const createSchema = z.object({
  storeId: z.string().min(1).max(120),
  keyword: z.string().min(1).max(120),
  source: z.enum(["naver", "google"]).optional(),
  isActive: z.boolean().optional(),
});

const patchSchema = z.object({
  targetId: z.string().uuid(),
  isActive: z.boolean(),
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
  const includeInactive = searchParams.get("includeInactive") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10) || 100, 200);

  try {
    const targets = await listRankTrackTargets(user.userId, { includeInactive, limit });
    return Response.json({ targets });
  } catch (err) {
    console.error("[api/rank/track] GET error:", err);
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

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const source = parsed.data.source ?? "naver";
    const normalizedStoreId = parsed.data.storeId.trim().toLowerCase();
    const normalizedKeyword = parsed.data.keyword.trim();

    // Validate that the smartstore actually exists
    try {
      const storeCheckUrl = `https://smartstore.naver.com/${normalizedStoreId}`;
      const storeRes = await fetch(storeCheckUrl, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; OptiSearch/1.0)",
        },
      });
      // Only treat 404 as "store not found"; other errors (429, 403, 5xx) are transient
      if (storeRes.status === 404) {
        return Response.json(
          { error: `존재하지 않는 스토어입니다. 스토어 URL을 확인해주세요. (${normalizedStoreId})`, code: "STORE_NOT_FOUND" },
          { status: 422 }
        );
      }
    } catch {
      // Network timeout or fetch failure — don't block the user, allow the request through
      console.warn(`[api/rank/track] Store check failed for ${normalizedStoreId}, proceeding anyway`);
    }

    // Check plan-based target limit (skip if this combo already exists = upsert update)
    const maxTargets = PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS]?.maxTrackTargets ?? 3;
    if (maxTargets !== -1) {
      const supabase = await createServerClient();
      const { data: existing } = await supabase
        .from("rank_track_targets")
        .select("id")
        .eq("user_id", user.userId)
        .eq("store_id", normalizedStoreId)
        .eq("keyword", normalizedKeyword)
        .eq("source", source)
        .maybeSingle();

      if (!existing) {
        // New combo — check count
        const { count } = await supabase
          .from("rank_track_targets")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.userId)
          .eq("is_active", true);

        if (count !== null && count >= maxTargets) {
          return Response.json(
            { error: `추적 키워드 한도에 도달했습니다. (현재 ${count}/${maxTargets}개) 플랜을 업그레이드해주세요.`, code: "TRACK_LIMIT_REACHED" },
            { status: 403 }
          );
        }
      }
    }

    const target = await createOrUpdateRankTrackTarget({
      userId: user.userId,
      storeId: normalizedStoreId,
      keyword: normalizedKeyword,
      source,
      isActive: parsed.data.isActive,
    });

    return Response.json({ target }, { status: 201 });
  } catch (err) {
    console.error("[api/rank/track] POST error:", err);
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
    // When reactivating, enforce plan-based target limit
    if (parsed.data.isActive) {
      const maxTargets = PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS]?.maxTrackTargets ?? 3;
      if (maxTargets !== -1) {
        const supabase = await createServerClient();
        const { count } = await supabase
          .from("rank_track_targets")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.userId)
          .eq("is_active", true);

        if (count !== null && count >= maxTargets) {
          return Response.json(
            { error: `추적 키워드 한도에 도달했습니다. (현재 ${count}/${maxTargets}개) 플랜을 업그레이드해주세요.`, code: "TRACK_LIMIT_REACHED" },
            { status: 403 }
          );
        }
      }
    }

    await setRankTrackTargetActive({
      userId: user.userId,
      targetId: parsed.data.targetId,
      isActive: parsed.data.isActive,
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("[api/rank/track] PATCH error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const rl = await checkRateLimit(user.userId);
  if (!rl.allowed) {
    return Response.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const targetId = searchParams.get("id");
  if (!targetId) {
    return Response.json({ error: "id 파라미터가 필요합니다." }, { status: 400 });
  }

  try {
    await deleteRankTrackTarget(user.userId, targetId);
    return Response.json({ success: true });
  } catch (err) {
    console.error("[api/rank/track] DELETE error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
