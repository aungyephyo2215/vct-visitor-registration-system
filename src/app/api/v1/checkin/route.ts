import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";
import { successResponse, errorResponse, validationErrorResponse } from "@/lib/api-response";
import { checkinSchema, formatZodErrors } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { sendNotification } from "@/lib/notifications/service";
import { resolveQrToken } from "@/lib/qr-token-resolver";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    requireRole(user, "SUPER_ADMIN", "PROPERTY_ADMIN", "SECURITY_GUARD");

    const body = await request.json();
    const parsed = checkinSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(formatZodErrors(parsed.error));
    }

    const { token } = parsed.data;
    const qrCode = await resolveQrToken(prisma, token);

    if (!qrCode) return errorResponse("Invalid QR code", 404);

    if (qrCode.status !== "ACTIVE") {
      return errorResponse(`QR code is ${qrCode.status.toLowerCase()}`, 400);
    }

    if (new Date() > qrCode.expires_at) {
      await prisma.qRCode.update({
        where: { id: qrCode.id },
        data: { status: "EXPIRED" },
      });
      return errorResponse("QR code has expired", 400);
    }

    if (qrCode.visit.status === "CHECKED_IN") {
      return errorResponse("Visit is already checked in", 400);
    }

    if (qrCode.visit.status === "CHECKED_OUT") {
      return errorResponse("Visit is already checked out", 400);
    }

    if (qrCode.visit.status === "CANCELLED") {
      return errorResponse("Visit is cancelled", 400);
    }

    // Check visitor exists (security must register before check-in)
    if (!qrCode.visit.visitor) {
      return errorResponse("Visitor not registered. Please register visitor before check-in.", 400);
    }

    // Check verification completed
    if (!qrCode.visit.verification) {
      return errorResponse(
        "Verification not completed. Please complete verification before check-in.",
        400,
      );
    }

    // Check blocklist
    const blocklistConditions = [
      qrCode.visit.visitor.phone ? { phone: qrCode.visit.visitor.phone } : null,
      qrCode.visit.visitor.id_number ? { id_number: qrCode.visit.visitor.id_number } : null,
    ].filter(Boolean);

    let blocked = null;
    if (blocklistConditions.length > 0) {
      blocked = await prisma.blocklist.findFirst({
        where: {
          property_id: qrCode.visit.property_id,
          status: "ACTIVE",
          OR: blocklistConditions as Array<{ phone: string } | { id_number: string }>,
        },
      });
    }

    if (blocked) {
      await createAuditLog({
        prisma,
        property_id: qrCode.visit.property_id,
        user_id: user.id,
        action: "BLOCKLIST_MATCH",
        resource_type: "visit",
        resource_id: qrCode.visit.id,
        ip_address: request.headers.get("x-forwarded-for") || undefined,
        user_agent: request.headers.get("user-agent") || undefined,
        metadata: { blocklist_id: blocked.id, reason: blocked.reason },
      });
      return errorResponse("Visitor is blocked", 403);
    }

    const now = new Date();

    await prisma.$transaction([
      prisma.visit.update({
        where: { id: qrCode.visit.id },
        data: { status: "CHECKED_IN", checkin_time: now },
      }),
      prisma.qRCode.update({
        where: { id: qrCode.id },
        data: { status: "USED", used_at: now },
      }),
    ]);

    await createAuditLog({
      prisma,
      property_id: qrCode.visit.property_id,
      user_id: user.id,
      action: "CHECK_IN",
      resource_type: "visit",
      resource_id: qrCode.visit.id,
      ip_address: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
    });

    // Notify host
    await sendNotification(
      prisma,
      "CHECKED_IN",
      {
        kind: "visit",
        hostUserId: qrCode.visit.host_user_id,
      },
      { visitor: qrCode.visit.visitor?.name ?? "Visitor" },
      qrCode.visit.property_id,
      qrCode.visit.id,
    );

    const updatedVisit = await prisma.visit.findUnique({
      where: { id: qrCode.visit.id },
      include: {
        visitor: { select: { id: true, name: true, phone: true } },
        unit: { select: { id: true, unit_no: true, floor: true } },
      },
    });

    return successResponse(updatedVisit);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", 400);
    }
    console.error("Check-in error:", error);
    return errorResponse("Internal server error", 500);
  }
}
