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

  const supabase = await createServerClient();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("plan")
    .eq("auth_user_id", user.userId)
    .single();

  return Response.json({
    plan: profile?.plan ?? "free",
  });
}
