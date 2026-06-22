import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { errorResponse, notFoundResponse, successResponse } from "@/lib/api-response";
import { sendInvitationQrEmail } from "@/lib/email/qr-delivery";
import { prisma } from "@/lib/prisma";
import { requirePropertyAccess, requireRole } from "@/lib/rbac";

const DEFAULT_RESEND_COOLDOWN_SECONDS = 300;
const MANUAL_RESEND_RAW_TOKEN_PLACEHOLDER = "[MANUAL_RESEND_NO_RAW_QR_TOKEN]";

function getResendCooldownSeconds(): number {
  const parsed = Number.parseInt(process.env.QR_EMAIL_RESEND_COOLDOWN_SECONDS || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RESEND_COOLDOWN_SECONDS;
}

function buildSafeEmailDeliverySummary(summary: {
  status: string;
  provider: string;
  deliveryId: string | null;
  failureCode?: string | null;
}) {
  return {
    status: summary.status,
    provider: summary.provider,
    deliveryId: summary.deliveryId,
    ...(summary.status === "SKIPPED" && summary.failureCode
      ? { skippedReason: summary.failureCode }
      : {}),
    ...(summary.status === "FAILED" && summary.failureCode
      ? { failureCode: summary.failureCode }
      : {}),
  };
}

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

    if (!invitation.visit_id) {
      return errorResponse("QR code has not been generated for this invitation", 400);
    }

    const qrCode = await prisma.qRCode.findFirst({
      where: {
        property_id: invitation.property_id,
        visit_id: invitation.visit_id,
        status: "ACTIVE",
        used_at: null,
        revoked_at: null,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: "desc" },
      select: { id: true },
    });

    if (!qrCode) {
      return errorResponse("No active QR code available for resend", 400);
    }

    const cooldownSeconds = getResendCooldownSeconds();
    const latestManualResend = await prisma.qrEmailDelivery.findFirst({
      where: {
        invitation_id: id,
        qr_code_id: qrCode.id,
        trigger_type: "MANUAL_RESEND",
      },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        created_at: true,
      },
    });

    if (latestManualResend) {
      const retryAfterSeconds =
        cooldownSeconds - Math.floor((Date.now() - latestManualResend.created_at.getTime()) / 1000);

      if (retryAfterSeconds > 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "QR email resend is on cooldown",
              details: {
                retryAfterSeconds,
                cooldownSeconds,
              },
            },
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(retryAfterSeconds),
            },
          },
        );
      }
    }

    const deliverySummary = await sendInvitationQrEmail(prisma, {
      invitationId: id,
      qrCodeId: qrCode.id,
      rawToken: MANUAL_RESEND_RAW_TOKEN_PLACEHOLDER,
      triggerType: "MANUAL_RESEND",
      createdBy: user.id,
    });

    await createAuditLog({
      prisma,
      property_id: invitation.property_id,
      user_id: user.id,
      action: "MANUAL_RESEND_QR_EMAIL",
      resource_type: "invitation",
      resource_id: id,
      ip_address: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
      metadata: {
        invitation_id: id,
        qr_code_id: qrCode.id,
        delivery_id: deliverySummary.deliveryId,
        cooldown_seconds: cooldownSeconds,
      },
    });

    return successResponse({
      emailDelivery: buildSafeEmailDeliverySummary({
        status: deliverySummary.status,
        provider: deliverySummary.provider,
        deliveryId: deliverySummary.deliveryId,
        failureCode: deliverySummary.failureCode,
      }),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const safeMessage = error instanceof Error ? error.message : "Unknown manual QR resend error";
    console.error("Manual resend QR email error:", safeMessage);
    return errorResponse("Internal server error", 500);
  }
}
