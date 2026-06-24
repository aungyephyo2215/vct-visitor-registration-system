import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requirePropertyAccess, requireRole } from "@/lib/rbac";
import { resolveQrToken } from "@/lib/qr-token-resolver";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    requireRole(user, "SUPER_ADMIN", "PROPERTY_ADMIN", "OFFICE_STAFF", "SECURITY_GUARD");

    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return errorResponse("token query parameter is required", 400);
    }

    const qrCode = await resolveQrToken(prisma, token);

    if (!qrCode) return errorResponse("Invalid QR code", 404);

    requirePropertyAccess(user, qrCode.property_id);

    return successResponse({
      qr: { id: qrCode.id, status: qrCode.status, expires_at: qrCode.expires_at },
      visit: qrCode.visit,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("QR lookup error:", error);
    return errorResponse("Internal server error", 500);
  }
}
