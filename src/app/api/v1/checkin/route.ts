import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, validationErrorResponse } from "@/lib/api-response";
import { checkinSchema, formatZodErrors } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = checkinSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(formatZodErrors(parsed.error));
    }

    const { token } = parsed.data;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const qrCode = await prisma.qRCode.findUnique({
      where: { token_hash: tokenHash },
      include: {
        visit: {
          include: {
            visitor: true,
            verification: { select: { id: true } },
          },
        },
      },
    });

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
      return errorResponse("Verification not completed. Please complete verification before check-in.", 400);
    }

    // Check blocklist
    const blocked = await prisma.blocklist.findFirst({
      where: {
        property_id: qrCode.visit.property_id,
        status: "ACTIVE",
        OR: [
          { phone: qrCode.visit.visitor.phone },
          { id_number: qrCode.visit.visitor.id_number },
        ].filter((c) => c.phone || c.id_number),
      },
    });

    if (blocked) {
      await createAuditLog({
        prisma,
        property_id: qrCode.visit.property_id,
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
      action: "CHECK_IN",
      resource_type: "visit",
      resource_id: qrCode.visit.id,
      ip_address: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
    });

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
