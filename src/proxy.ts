import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge request filter — Next 16's replacement for the deprecated `middleware`
 * file convention. Same contract, new name: export `proxy` plus a matcher.
 *
 * It does two jobs and deliberately no more:
 *   - CORS for /api, including preflight, so the mobile app can call in
 *   - a cookie gate on /dashboard, so an unauthenticated visitor lands on /login
 *
 * Authorization proper is NOT done here. Every route re-reads the user and asks
 * `can(user, PERMISSION)` (src/lib/rbac.ts), because a cookie says who you claim
 * to be, not what you may do — and this runs before any database is reachable.
 */

// NOTE: matched with startsWith(), so never add "/" here — it would make every
// route public. "/" needs no entry: only /dashboard is token-guarded, and the
// home page at "/" is public by default.
const publicPaths = ["/login", "/api/auth/login", "/api/auth/logout"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CORS - allow all origins for API (including mobile apps without origin header)
  const origin = request.headers.get("origin") || "*";
  const isApi = pathname.startsWith("/api");

  if (isApi) {
    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400",
        },
      });
    }
  }

  // Allow public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    const response = NextResponse.next();
    if (isApi) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }
    return response;
  }

  // Check for auth token
  const token = request.cookies.get("auth-token")?.value;

  // Redirect to login if no token and trying to access protected route
  if (!token && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.next();

  // Add CORS headers to all API responses
  if (isApi) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
