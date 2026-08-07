import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { JWTPayload } from "jose";
import { verifyAccessToken } from "@/lib/jwt";

const LOG_FORMAT = process.env.LOG_FORMAT || "pretty";
const LOG_TIMEZONE = process.env.LOG_TIMEZONE || process.env.TZ || "Asia/Bangkok";

const timeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: LOG_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZoneName: "longOffset",
});

function localTimestamp() {
  const parts = Object.fromEntries(
    timeFormatter.formatToParts(new Date()).map((part) => [part.type, part.value]),
  );
  const offset = parts.timeZoneName?.replace("GMT", "") || "+07:00";

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} ${offset}`;
}

function log(level: string, message: string, data?: Record<string, unknown>) {
  const entry = {
    level,
    message,
    timestamp: localTimestamp(),
    ...data,
  };

  if (LOG_FORMAT === "json") {
    console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](JSON.stringify(entry));
  } else {
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
    const extra = data ? ` ${JSON.stringify(data)}` : "";
    console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
      `${prefix} ${message}${extra}`,
    );
  }
}

function setUserHeaders(headers: Headers, payload: JWTPayload): Headers {
  const h = new Headers(headers);
  h.set("x-user-id", payload.sub as string);
  h.set("x-user-email", (payload.email as string) || "");
  h.set("x-user-role", (payload.role as string) || "");
  h.set("x-user-property-id", (payload.property_id as string) || "");
  return h;
}

const protectedPages = [
  "/dashboard",
  "/visitors",
  "/visits",
  "/invitations",
  "/security",
  "/reports",
  "/settings",
];

const publicApiPaths = ["/api/health", "/api/v1/auth/login", "/api/v1/auth/logout"];

const publicPaths = ["/", "/login", "/_next", "/favicon.ico"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const start = Date.now();

  // Always allow public paths
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    // Still try to set user headers for public pages if token exists
    const token = request.cookies.get("access_token")?.value;
    if (token) {
      const payload = await verifyAccessToken(token);
      if (payload?.sub) {
        return NextResponse.next({
          request: { headers: setUserHeaders(request.headers, payload) },
        });
      }
    }
    return NextResponse.next();
  }

  const token = request.cookies.get("access_token")?.value;

  // API route protection
  if (pathname.startsWith("/api/")) {
    if (publicApiPaths.some((p) => pathname === p)) {
      log("info", "request", { method, pathname, status: 200, duration_ms: Date.now() - start });
      return NextResponse.next();
    }

    if (!token) {
      log("warn", "unauthorized", {
        method,
        pathname,
        status: 401,
        duration_ms: Date.now() - start,
      });
      return NextResponse.json(
        { success: false, error: { message: "Authentication required" } },
        { status: 401 },
      );
    }

    const payload = await verifyAccessToken(token);
    if (!payload?.sub) {
      log("warn", "invalid_token", {
        method,
        pathname,
        status: 401,
        duration_ms: Date.now() - start,
      });
      return NextResponse.json(
        { success: false, error: { message: "Invalid or expired token" } },
        { status: 401 },
      );
    }

    log("info", "request", {
      method,
      pathname,
      status: 200,
      user_id: payload.sub,
      duration_ms: Date.now() - start,
    });
    return NextResponse.next({
      request: { headers: setUserHeaders(request.headers, payload) },
    });
  }

  // Page route protection
  if (protectedPages.some((p) => pathname.startsWith(p))) {
    if (!token) {
      log("info", "redirect_to_login", { method, pathname, duration_ms: Date.now() - start });
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await verifyAccessToken(token);
    if (!payload?.sub) {
      log("warn", "invalid_token", { method, pathname, duration_ms: Date.now() - start });
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next({
      request: { headers: setUserHeaders(request.headers, payload) },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|_next/data|images|icons|manifest\\.json|sw\\.js).*)"],
};
