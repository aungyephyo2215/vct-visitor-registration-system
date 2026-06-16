import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";

const protectedPages = [
  "/dashboard",
  "/visitors",
  "/visits",
  "/invitations",
  "/security",
  "/reports",
  "/settings",
];

const publicApiPaths = [
  "/api/v1/auth/login",
  "/api/v1/auth/logout",
];

const publicPaths = [
  "/",
  "/login",
  "/_next",
  "/favicon.ico",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    // Still try to set user headers for public pages if token exists
    const token = request.cookies.get("access_token")?.value;
    if (token) {
      const payload = await verifyAccessToken(token);
      if (payload?.sub) {
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set("x-user-id", payload.sub as string);
        requestHeaders.set("x-user-email", (payload.email as string) || "");
        requestHeaders.set("x-user-role", (payload.role as string) || "");
        requestHeaders.set(
          "x-user-property-id",
          (payload.property_id as string) || ""
        );
        return NextResponse.next({ request: { headers: requestHeaders } });
      }
    }
    return NextResponse.next();
  }

  const token = request.cookies.get("access_token")?.value;

  // API route protection
  if (pathname.startsWith("/api/")) {
    if (publicApiPaths.some((p) => pathname === p)) {
      return NextResponse.next();
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: { message: "Authentication required" } },
        { status: 401 }
      );
    }

    const payload = await verifyAccessToken(token);
    if (!payload?.sub) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid or expired token" } },
        { status: 401 }
      );
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", payload.sub as string);
    requestHeaders.set("x-user-email", (payload.email as string) || "");
    requestHeaders.set("x-user-role", (payload.role as string) || "");
    requestHeaders.set(
      "x-user-property-id",
      (payload.property_id as string) || ""
    );

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Page route protection
  if (protectedPages.some((p) => pathname.startsWith(p))) {
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await verifyAccessToken(token);
    if (!payload?.sub) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", payload.sub as string);
    requestHeaders.set("x-user-email", (payload.email as string) || "");
    requestHeaders.set("x-user-role", (payload.role as string) || "");
    requestHeaders.set(
      "x-user-property-id",
      (payload.property_id as string) || ""
    );

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/data|images|icons|manifest\\.json|sw\\.js).*)",
  ],
};
