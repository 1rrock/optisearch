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

  // Create profile if doesn't exist (auto-registration on first login)
  const { data: created, error } = await supabase
    .from("user_profiles")
    .insert({
      auth_user_id: authUserId,
      name: session?.user?.name ?? null,
      email: session?.user?.email ?? null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create user profile: ${error.message}`);
  }

  return created?.id ?? null;
}
