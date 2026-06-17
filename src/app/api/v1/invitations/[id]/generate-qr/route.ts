import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { requirePropertyAccess, requireRole } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { sendNotification } from "@/lib/notifications/service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    requireRole(user, "SUPER_ADMIN", "PROPERTY_ADMIN", "OFFICE_STAFF", "SECURITY_GUARD");
    const { id } = await params;

    const invitation = await prisma.invitation.findFirst({
      where: { id, deleted_at: null },
    });

    if (!invitation) return notFoundResponse("Invitation not found");

    requirePropertyAccess(user, invitation.property_id);

    if (invitation.status !== "APPROVED") {
      return errorResponse(
        `Invitation is ${invitation.status.toLowerCase()}, must be APPROVED`,
        400,
      );
    }

    if (invitation.visit_id) {
      return errorResponse("QR code already generated for this invitation", 400);
    }

    // Create Visit (no visitor yet — security attaches at check-in)
    const visit = await prisma.visit.create({
      data: {
        property_id: invitation.property_id,
        visitor_id: null,
        unit_id: invitation.unit_id,
        host_user_id: invitation.invited_by,
        purpose: "OTHER",
        notes:
          invitation.notes || `Invitation: ${invitation.visitor_name} (${invitation.visitor_type})`,
        expected_checkin_time: invitation.expected_date,
        status: "EXPECTED",
      },
    });

    // Generate QR token
    const token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const expiresMinutes = parseInt(process.env.QR_EXPIRES_MINUTES || "1440", 10);
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

    const qrCode = await prisma.qRCode.create({
      data: {
        property_id: invitation.property_id,
        visit_id: visit.id,
        token_hash: tokenHash,
        status: "ACTIVE",
        expires_at: expiresAt,
      },
    });

    // Link invitation to visit
    await prisma.invitation.update({
      where: { id },
      data: { visit_id: visit.id },
    });

    await createAuditLog({
      prisma,
      property_id: invitation.property_id,
      user_id: user.id,
      action: "GENERATE_QR",
      resource_type: "visit",
      resource_id: visit.id,
      ip_address: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
      metadata: { invitation_id: id, source: "invitation" },
    });

    // Notify inviter
    await sendNotification(
      prisma,
      "QR_GENERATED",
      {
        kind: "invitation",
        invitedBy: invitation.invited_by,
      },
      { visitor: invitation.visitor_name },
      invitation.property_id,
      visit.id,
      { invitation_id: id },
    );

    return successResponse(
      {
        token,
        expires_at: expiresAt,
        visit_id: visit.id,
        qr_code_id: qrCode.id,
      },
      201,
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Generate QR from invitation error:", error);
    return errorResponse("Internal server error", 500);
  }
}
