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

  // Create profile if doesn't exist (auto-registration on first login)
  // Use upsert to prevent race condition when concurrent requests arrive for a new user
  const { data: created, error } = await supabase
    .from("user_profiles")
    .upsert(
      {
        auth_user_id: authUserId,
        name: session?.user?.name ?? null,
        email: session?.user?.email ?? null,
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
