const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(token: string): Promise<boolean> {
  if (process.env.NODE_ENV === "development") return true; // localhost dev bypass

  // 시크릿이 없으면 통과시키지 않는다. 예전에는 true를 반환해서, 운영에서 키가
  // 빠지면 공개 AI 라우트의 CAPTCHA가 통째로 무력화됐다.
  if (!TURNSTILE_SECRET_KEY) {
    console.error("[turnstile] TURNSTILE_SECRET_KEY is not set — rejecting request");
    return false;
  }

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: TURNSTILE_SECRET_KEY,
        response: token,
      }),
    });

    const data = await response.json();
    return data.success === true;
  } catch (err) {
    console.error("[turnstile] Verification request failed:", err);
    return false;
  }
}
