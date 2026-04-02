// Mock user for dev bypass — must be a valid UUID for DB compatibility
export const DEV_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Dev Tester",
  email: "dev@optisearch.test",
  image: "",
};

export function isDevBypass(): boolean {
  return process.env.DEV_AUTH_BYPASS === "true";
}
