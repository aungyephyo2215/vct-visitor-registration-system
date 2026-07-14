import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loginSchema, formatZodErrors } from "@/lib/validations";
import { verifyPassword } from "@/lib/password";
import {
  signAccessToken,
  signRefreshToken,
  getAccessTokenMaxAge,
  getRefreshTokenMaxAge,
} from "@/lib/jwt";
import { toSafeUser } from "@/lib/auth";
import { successResponse, errorResponse, validationErrorResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimit = checkRateLimit(`login:${ip}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: { message: "Too many login attempts. Try again later." } },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          },
        },
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(formatZodErrors(parsed.error));
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return errorResponse("Invalid email or password", 401);
    }

    if (user.status === "INACTIVE") {
      return errorResponse("Account is inactive. Contact administrator.", 403);
    }

    if (user.status === "LOCKED") {
      return errorResponse("Account is locked. Contact administrator.", 403);
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return errorResponse("Invalid email or password", 401);
    }

    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      property_id: user.property_id || undefined,
    });

    const refreshToken = await signRefreshToken({
      sub: user.id,
    });

    const cookieOptions = (maxAge: number) => ({
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge,
    });

    const cookieStore = await cookies();
    cookieStore.set("access_token", accessToken, cookieOptions(getAccessTokenMaxAge()));
    cookieStore.set("refresh_token", refreshToken, cookieOptions(getRefreshTokenMaxAge()));

    await createAuditLog({
      prisma,
      property_id: user.property_id,
      user_id: user.id,
      action: "LOGIN",
      resource_type: "user",
      resource_id: user.id,
      ip_address: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
    });

    return successResponse({ user: toSafeUser(user) });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", 400);
    }
    console.error("Login error:", error);
    return errorResponse("Internal server error", 500);
  }
}
