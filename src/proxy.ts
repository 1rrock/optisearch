import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Routes that do not require authentication.
const PUBLIC_PATHS = new Set(["/", "/login", "/privacy", "/terms", "/support", "/pricing"])

// API route prefixes that handle their own auth (webhooks, cron, etc.)
const PUBLIC_API_PREFIXES = [
  "/api/auth/",
  "/api/cron/",
  "/api/webhooks/",
  "/api/payments/payapp/webhook",
  "/api/payments/payapp/activate-from-return",
]

// Path prefixes that do not require authentication (e.g., /tools/*, /guides/*, /api/public/*)
const PUBLIC_PATH_PREFIXES = ["/tools", "/guides", "/api/public/"]

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true
  for (const prefix of PUBLIC_API_PREFIXES) {
    if (pathname.startsWith(prefix)) return true
  }
  for (const prefix of PUBLIC_PATH_PREFIXES) {
    if (pathname.startsWith(prefix)) return true
  }
  return false
}

/**
 * Proxy (formerly middleware) for auth redirect.
 *
 * Optimistic cookie check: verifies the auth session cookie exists.
 * Actual auth validation happens in API route handlers via getAuthenticatedUser().
 *
 * Note: next-auth's auth() wrapper was for middleware convention.
 * In proxy convention, we check the session cookie directly.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const hasSessionCookie =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token")

  // 로그인 상태에서 /login 접근 시 dashboard로 리다이렉트
  if (pathname === "/login" && hasSessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin))
  }

  // Dev bypass - skip auth enforcement (production에서는 절대 활성화 금지)
  if (process.env.DEV_AUTH_BYPASS === "true" && process.env.NODE_ENV !== "production") {
    return NextResponse.next()
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Optimistic auth check: look for the session cookie
  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", req.nextUrl.origin)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|css|js|xml|html|webmanifest)$).*)"],
}
