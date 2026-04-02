import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Server-side Supabase client using service_role key.
 * Bypasses RLS — safe because all DB access is server-side only.
 * Auth is handled by Auth.js, not Supabase Auth.
 */
export async function createServerClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Use service_role key to bypass RLS; fall back to anon key if not set
  return createClient(supabaseUrl, serviceRoleKey || supabaseAnonKey);
}

/**
 * Browser-side Supabase client for use in Client Components.
 * Singleton pattern — safe to call on every render.
 */
let browserClient: ReturnType<typeof createClient> | null = null;

export function createBrowserClient() {
  if (browserClient) return browserClient;
  browserClient = createClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}
