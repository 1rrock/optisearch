// Mock user for dev bypass
export const DEV_USER = {
  id: "dev-test-user-001",
  name: "Dev Tester",
  email: "dev@optisearch.test",
  image: "",
};

export function isDevBypass(): boolean {
  return process.env.DEV_AUTH_BYPASS === "true";
}
