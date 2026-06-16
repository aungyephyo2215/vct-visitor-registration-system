import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requirePropertyAccess, requireRole } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    requireRole(user, "SUPER_ADMIN", "PROPERTY_ADMIN", "OFFICE_STAFF", "SECURITY_GUARD");

    const body = await request.json();
    const { token } = body;
    if (!token) {
      return errorResponse("QR token is required", 400);
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const qrCode = await prisma.qRCode.findUnique({
      where: { token_hash: tokenHash },
      include: { visit: true },
    });

    if (!qrCode) return errorResponse("Invalid QR code", 404);

    requirePropertyAccess(user, qrCode.property_id);

    if (qrCode.visit.status !== "CHECKED_IN") {
      return errorResponse(`Visit is ${qrCode.visit.status.toLowerCase()}, not checked in`, 400);
    }

    if (qrCode.visit.checkout_time) {
      return errorResponse("Visit is already checked out", 400);
    }

    const now = new Date();

    const updated = await prisma.visit.update({
      where: { id: qrCode.visit.id },
      data: { status: "CHECKED_OUT", checkout_time: now },
      include: {
        visitor: { select: { id: true, name: true, phone: true } },
        unit: { select: { id: true, unit_no: true, floor: true } },
        verification: {
          select: { id: true, nda_signed: true, safety_form_signed: true },
        },
      },
    });

    await createAuditLog({
      prisma,
      property_id: qrCode.visit.property_id,
      user_id: user.id,
      action: "CHECK_OUT",
      resource_type: "visit",
      resource_id: qrCode.visit.id,
      ip_address: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", 400);
    }
    console.error("QR checkout error:", error);
    return errorResponse("Internal server error", 500);
  }
}
