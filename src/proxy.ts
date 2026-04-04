import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Routes that do not require authentication.
const PUBLIC_PATHS = new Set(["/", "/login", "/privacy", "/terms"])

// API route prefixes that handle their own auth (webhooks, cron, etc.)
const PUBLIC_API_PREFIXES = ["/api/auth/", "/api/webhooks/", "/api/cron/"]

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true
  for (const prefix of PUBLIC_API_PREFIXES) {
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
  // Dev bypass - skip auth redirect (production에서는 절대 활성화 금지)
  if (process.env.DEV_AUTH_BYPASS === "true" && process.env.NODE_ENV !== "production") {
    return NextResponse.next()
  }

  const { pathname } = req.nextUrl

  // 로그인 상태에서 /login 접근 시 dashboard로 리다이렉트
  if (pathname === "/login") {
    const hasSessionCookie =
      req.cookies.has("authjs.session-token") ||
      req.cookies.has("__Secure-authjs.session-token")
    if (hasSessionCookie) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin))
    }
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Optimistic auth check: look for the session cookie
  // next-auth v5 uses "authjs.session-token" (secure) or "__Secure-authjs.session-token"
  const hasSessionCookie =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token")

  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", req.nextUrl.origin)
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.href)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|css|js)$).*)"],
}
