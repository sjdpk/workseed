import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/api/auth/login", "/api/auth/logout"];

export function middleware(request: NextRequest) {
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

  // Handle API auth
  if (!token && isApi && !publicPaths.some(p => pathname.startsWith(p))) {
    // Check for Authorization header in middleware or let the route handler deal with it?
    // Since we updated getCurrentUser to support Bearer, heartbeat/me should be checked.
    // But middleware might block it if we are not careful.
    // Existing middleware doesn't block /api/auth/me because it doesn't start with /dashboard.
  }

  const response = NextResponse.next();

  // Add CORS headers to all API responses
  if (isApi) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  // Redirect to dashboard if logged in and trying to access login
  if (token && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
