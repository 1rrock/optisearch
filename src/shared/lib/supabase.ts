import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/**
 * Server-side Supabase client using service_role key.
 * Bypasses RLS — safe because all DB access is server-side only.
 * Auth is handled by Auth.js, not Supabase Auth.
 */
export async function createServerClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("[supabase] SUPABASE_SERVICE_ROLE_KEY is not set. Server-side DB access requires the service_role key.");
  }
  return createClient(supabaseUrl, serviceRoleKey);
}
