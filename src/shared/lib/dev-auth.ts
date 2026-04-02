// Mock user for dev bypass
// authId = row in public.users table (NextAuth adapter table, FK target)
// profileId = row in user_profiles table (our app's user table)
export const DEV_USER = {
  authId: "a3083c94-2ea2-4e13-84bb-a25e60709994",
  profileId: "538c1f0d-b269-4ed6-94f8-3b0f267620ba",
  name: "Dev Tester",
  email: "dev@optisearch.test",
  image: "",
};

export function isDevBypass(): boolean {
  return process.env.DEV_AUTH_BYPASS === "true";
}
