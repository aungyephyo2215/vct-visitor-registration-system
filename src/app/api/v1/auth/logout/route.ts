import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { successResponse } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (user) {
      await createAuditLog({
        prisma,
        property_id: user.property_id || "unknown",
        user_id: user.id,
        action: "LOGOUT",
        resource_type: "user",
        resource_id: user.id,
        ip_address: request.headers.get("x-forwarded-for") || undefined,
        user_agent: request.headers.get("user-agent") || undefined,
      });
    }

    const clearOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 0,
    };
    const cookieStore = await cookies();
    cookieStore.set("access_token", "", clearOpts);
    cookieStore.set("refresh_token", "", clearOpts);

    return successResponse({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return successResponse({ message: "Logged out successfully" });
  }
}
