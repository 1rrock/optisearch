import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { createServerClient } from "@/shared/lib/supabase";

/**
 * GET /api/subscription — 현재 구독(플랜) 정보 조회
 */
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const supabase = await createServerClient();
    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("plan")
      .eq("auth_user_id", user.userId)
      .single();

    if (error) {
      console.error("[subscription] DB error:", error.message);
      return Response.json({ error: "구독 정보 조회에 실패했습니다." }, { status: 500 });
    }

    return Response.json({
      plan: profile?.plan ?? "free",
    });
  } catch (err) {
    console.error("[subscription] Fatal error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
