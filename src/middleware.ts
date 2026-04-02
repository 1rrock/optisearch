import { auth } from "@/auth"
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

export default auth((req: NextRequest & { auth: unknown }) => {
  // Dev bypass - skip auth redirect
  if (process.env.DEV_AUTH_BYPASS === "true") {
    return NextResponse.next()
  }

  const { pathname } = req.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // `req.auth` is injected by the `auth` wrapper; null means unauthenticated.
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin)
    // Preserve the originally-requested URL so /login can redirect back after
    // a successful sign-in.
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.href)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  /*
   * Apply middleware to every route EXCEPT:
   *   - Next.js internals (_next/static, _next/image)
   *   - The public /favicon.ico
   *
   * Auth-specific public paths (/login, /api/auth/*) are handled inside the
   * middleware function itself so we can keep the matcher simple.
   */
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|css|js)$).*)"],
}
