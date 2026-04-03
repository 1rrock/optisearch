import { z } from "zod";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import {
  getSavedKeywords,
  saveKeyword,
  unsaveKeyword,
  countSavedKeywords,
} from "@/services/saved-keyword-service";

const FREE_PLAN_SAVED_LIMIT = 10;

// ---------------------------------------------------------------------------
// GET: List saved keywords (paginated)
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);

  try {
    const keywords = await getSavedKeywords(user.userId, limit);
    return Response.json({ keywords });
  } catch (err) {
    console.error("[api/keywords/saved] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST: Save a keyword
// ---------------------------------------------------------------------------

const saveSchema = z.object({
  keyword: z.string().min(1).max(100),
  memo: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // Enforce free plan limit
  if (user.plan === "free") {
    try {
      const count = await countSavedKeywords(user.userId);
      if (count >= FREE_PLAN_SAVED_LIMIT) {
        return Response.json(
          {
            error: `무료 플랜은 최대 ${FREE_PLAN_SAVED_LIMIT}개까지 저장할 수 있습니다.`,
            code: "SAVED_LIMIT_EXCEEDED",
          },
          { status: 429 }
        );
      }
    } catch (err) {
      console.error("[api/keywords/saved] Error:", err);
      return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
  }

  try {
    const saved = await saveKeyword(user.userId, parsed.data.keyword, parsed.data.memo);
    return Response.json({ keyword: saved }, { status: 201 });
  } catch (err) {
    console.error("[api/keywords/saved] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE: Remove a saved keyword
// ---------------------------------------------------------------------------

const deleteSchema = z.object({
  keyword: z.string().min(1),
});

export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    await unsaveKeyword(user.userId, parsed.data.keyword);
    return Response.json({ success: true });
  } catch (err) {
    console.error("[api/keywords/saved] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
