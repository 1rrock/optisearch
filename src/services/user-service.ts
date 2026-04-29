import { auth } from "@/auth";
import { createServerClient } from "@/shared/lib/supabase";

/**
 * Get the current user's profile ID from the database.
 * Creates a user_profiles entry if one doesn't exist yet.
 * Also ensures the public.users row exists (FK target).
 */
export async function getCurrentUserProfileId(): Promise<string | null> {
  const session = await auth();
  const authUserId = session?.user?.id;
  if (!authUserId) return null;

  const supabase = await createServerClient();

  // Try to get existing profile
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_user_id", authUserId)
    .single();

  if (existing) return existing.id;

  // Ensure public.users row exists (NextAuth adapter table, FK target)
  // users.id may be UUID type — wrap in try/catch since naverId may not be UUID
  try {
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", authUserId)
      .single();

    if (!existingUser) {
      await supabase.from("users").insert({
        id: authUserId,
        name: session?.user?.name ?? null,
        email: session?.user?.email ?? null,
      });
    }
  } catch {
    // users table insert may fail if id is UUID type and naverId is not UUID — safe to ignore
    console.log("[user-service] users table insert skipped (id type mismatch)");
  }

  // Create profile if doesn't exist (auto-registration on first login).
  // Use upsert to prevent race condition when concurrent requests arrive for a new user.
  //
  // 14일 무료 체험은 "최초 가입자"에게만 부여한다. 가입 → 탈퇴 → 재가입 시 트라이얼이
  // 다시 발급되지 않도록 trial_grants 테이블에 (email, auth_user_id) 부여 이력을 영구 보관한다.
  // (migration 20260428_trial_grants.sql)
  const email = session?.user?.email ?? null;

  const grantFilters: string[] = [];
  if (email) grantFilters.push(`email.eq.${email}`);
  if (authUserId) grantFilters.push(`auth_user_id.eq.${authUserId}`);

  let priorGrant: { id: string } | null = null;
  if (grantFilters.length > 0) {
    const { data } = await supabase
      .from("trial_grants")
      .select("id")
      .or(grantFilters.join(","))
      .limit(1)
      .maybeSingle();
    priorGrant = data;
  }

  let trialStartedAt: string | null = null;
  let trialEndsAt: string | null = null;

  if (!priorGrant) {
    // Race-safe 부여 기록: 동시 가입 요청이 도착해도 unique index가 한 쪽만 통과시킨다.
    const { error: grantError } = await supabase
      .from("trial_grants")
      .insert({ email, auth_user_id: authUserId });

    if (!grantError) {
      const now = new Date();
      trialStartedAt = now.toISOString();
      trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
    }
    // grantError가 unique violation이면 다른 요청이 먼저 부여를 차지한 것 → 트라이얼 미부여로 진행
  }

  const { data: created, error } = await supabase
    .from("user_profiles")
    .upsert(
      {
        auth_user_id: authUserId,
        name: session?.user?.name ?? null,
        email,
        trial_started_at: trialStartedAt,
        trial_ends_at: trialEndsAt,
      },
      { onConflict: "auth_user_id" }
    )
    .select("id")
    .single();

  if (error) {
    console.error("[user-service] Failed to create user profile:", error.message);
    throw new Error(`Failed to create user profile: ${error.message}`);
  }

  return created?.id ?? null;
}
