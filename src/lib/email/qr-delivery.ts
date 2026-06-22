import { randomUUID } from "node:crypto";

import { format } from "date-fns";

import type { PrismaClient } from "@/generated/prisma/client";
import { QrEmailDeliveryStatus, QrEmailDeliveryTriggerType } from "@/generated/prisma/enums";

import { getEmailProvider } from "./provider";
import { buildVisitorQrEmailTemplate } from "./template";
import type {
  QrEmailDeliverySummary,
  QrEmailSendParams,
  QrEmailDeliveryStatusValue,
  QrEmailDeliveryTriggerTypeValue,
} from "./types";

type InvitationEmailContext = Awaited<ReturnType<typeof getInvitationEmailContext>>;

type DeliveryRow = {
  id: string;
  recipient_email: string;
  provider: string;
  provider_message_id: string | null;
  failure_code: string | null;
  failure_message: string | null;
  sent_at: Date | null;
  status: QrEmailDeliveryStatusValue;
  email_access_token: string | null;
  expires_at: Date | null;
};

type AutoClaimResult =
  | { kind: "claimed"; delivery: DeliveryRow }
  | { kind: "existing-sent"; delivery: DeliveryRow }
  | { kind: "in-progress"; delivery: DeliveryRow };

function isQrEmailEnabled(): boolean {
  const value = process.env.QR_EMAIL_ENABLED?.trim().toLowerCase();
  return value !== "false";
}

function getBaseUrl(): string {
  return (
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000"
  );
}

function buildQrAccessUrl(emailAccessToken: string): string {
  return `${getBaseUrl()}/qr-access/${encodeURIComponent(emailAccessToken)}`;
}

function buildQrImageUrl(emailAccessToken: string): string {
  return `${getBaseUrl()}/api/v1/qr/email-image/${encodeURIComponent(emailAccessToken)}`;
}

function buildUnitLabel(unitNo: string, floor?: number | null): string {
  if (floor == null) return `Unit ${unitNo}`;
  return `Floor ${floor} / Unit ${unitNo}`;
}

function sanitizeFailureMessage(message: string | undefined, rawToken: string): string | null {
  if (!message) return null;
  return message.replaceAll(rawToken, "[REDACTED]").slice(0, 500);
}

function buildIdempotencyKey(
  triggerType: QrEmailDeliveryTriggerTypeValue,
  qrCodeId: string,
): string | null {
  if (triggerType !== "AUTO") return null;
  return `AUTO:${qrCodeId}`;
}

function buildEmailAccessToken(): string {
  return randomUUID();
}

function mapDeliveryStatus(status: QrEmailDeliveryStatusValue) {
  return status === "PENDING"
    ? QrEmailDeliveryStatus.PENDING
    : status === "SENT"
      ? QrEmailDeliveryStatus.SENT
      : status === "FAILED"
        ? QrEmailDeliveryStatus.FAILED
        : QrEmailDeliveryStatus.SKIPPED;
}

function getHostName(context: NonNullable<InvitationEmailContext>): string {
  const visit = context.visit;
  return visit?.host?.name || context.inviter.name;
}

function getHostRoleLabel(context: NonNullable<InvitationEmailContext>): string {
  const visit = context.visit;
  return visit?.host ? "Resident" : "Host";
}

function isUniqueConstraintError(error: unknown): error is { code: string } {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002",
  );
}

async function getInvitationEmailContext(prisma: PrismaClient, invitationId: string) {
  return prisma.invitation.findFirst({
    where: { id: invitationId, deleted_at: null },
    include: {
      property: { select: { id: true, name: true, address: true } },
      unit: { select: { id: true, unit_no: true, floor: true } },
      inviter: { select: { id: true, name: true, email: true } },
      visit: {
        include: {
          host: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
}

async function createDeliveryRecord(
  prisma: PrismaClient,
  args: {
    invitation: NonNullable<InvitationEmailContext>;
    qrCodeId: string;
    triggerType: QrEmailDeliveryTriggerTypeValue;
    createdBy?: string;
    recipientEmail: string;
    status: QrEmailDeliveryStatusValue;
    provider: string;
    subject: string;
    idempotencyKey?: string | null;
    emailAccessToken?: string | null;
    expiresAt?: Date | null;
    providerMessageId?: string | null;
    failureCode?: string | null;
    failureMessage?: string | null;
    sentAt?: Date | null;
  },
): Promise<QrEmailDeliverySummary> {
  const created = await prisma.qrEmailDelivery.create({
    data: {
      property_id: args.invitation.property_id,
      invitation_id: args.invitation.id,
      visit_id: args.invitation.visit_id!,
      qr_code_id: args.qrCodeId,
      recipient_email: args.recipientEmail,
      trigger_type:
        args.triggerType === "MANUAL_RESEND"
          ? QrEmailDeliveryTriggerType.MANUAL_RESEND
          : QrEmailDeliveryTriggerType.AUTO,
      status: mapDeliveryStatus(args.status),
      provider: args.provider,
      provider_message_id: args.providerMessageId ?? null,
      subject: args.subject,
      idempotency_key: args.idempotencyKey ?? null,
      email_access_token: args.emailAccessToken ?? null,
      failure_code: args.failureCode ?? null,
      failure_message: args.failureMessage ?? null,
      sent_at: args.sentAt ?? null,
      expires_at: args.expiresAt ?? null,
      created_by: args.createdBy ?? null,
    },
  });

  return {
    deliveryId: created.id,
    attempted: args.status !== "SKIPPED",
    status: args.status,
    recipientEmail: created.recipient_email || null,
    provider: created.provider,
    triggerType: args.triggerType,
    providerMessageId: created.provider_message_id,
    failureCode: created.failure_code,
    failureMessage: created.failure_message,
    sentAt: created.sent_at,
  };
}

function buildDeliverySummary(
  delivery: DeliveryRow,
  triggerType: QrEmailDeliveryTriggerTypeValue,
  overrides?: Partial<QrEmailDeliverySummary>,
): QrEmailDeliverySummary {
  return {
    deliveryId: delivery.id,
    attempted: delivery.status !== "SKIPPED",
    status: delivery.status,
    recipientEmail: delivery.recipient_email || null,
    provider: delivery.provider,
    triggerType,
    providerMessageId: delivery.provider_message_id,
    failureCode: delivery.failure_code,
    failureMessage: delivery.failure_message,
    sentAt: delivery.sent_at,
    ...overrides,
  };
}

function buildExistingDeliverySummary(
  existingDelivery: DeliveryRow,
  triggerType: QrEmailDeliveryTriggerTypeValue,
): QrEmailDeliverySummary {
  return buildDeliverySummary(existingDelivery, triggerType, {
    attempted: false,
    status: "SKIPPED",
  });
}

function buildInProgressSummary(
  delivery: DeliveryRow,
  triggerType: QrEmailDeliveryTriggerTypeValue,
): QrEmailDeliverySummary {
  return buildDeliverySummary(delivery, triggerType, {
    attempted: false,
    status: "SKIPPED",
    failureCode: "AUTO_SEND_IN_PROGRESS",
    failureMessage: "Automatic QR email delivery is already in progress",
  });
}

async function getExistingAutoDelivery(
  prisma: PrismaClient,
  idempotencyKey: string,
): Promise<DeliveryRow | null> {
  return prisma.qrEmailDelivery.findUnique({
    where: { idempotency_key: idempotencyKey },
    select: {
      id: true,
      recipient_email: true,
      provider: true,
      provider_message_id: true,
      failure_code: true,
      failure_message: true,
      sent_at: true,
      status: true,
      email_access_token: true,
      expires_at: true,
    },
  }) as Promise<DeliveryRow | null>;
}

async function finalizeClaimedDelivery(
  prisma: PrismaClient,
  args: {
    deliveryId: string;
    status: Extract<QrEmailDeliveryStatusValue, "SENT" | "FAILED" | "SKIPPED">;
    provider: string;
    recipientEmail: string;
    providerMessageId?: string | null;
    failureCode?: string | null;
    failureMessage?: string | null;
    sentAt?: Date | null;
  },
): Promise<DeliveryRow> {
  return prisma.qrEmailDelivery.update({
    where: { id: args.deliveryId },
    data: {
      status: mapDeliveryStatus(args.status),
      provider: args.provider,
      recipient_email: args.recipientEmail,
      provider_message_id: args.providerMessageId ?? null,
      failure_code: args.failureCode ?? null,
      failure_message: args.failureMessage ?? null,
      sent_at: args.sentAt ?? null,
    },
    select: {
      id: true,
      recipient_email: true,
      provider: true,
      provider_message_id: true,
      failure_code: true,
      failure_message: true,
      sent_at: true,
      status: true,
      email_access_token: true,
      expires_at: true,
    },
  }) as Promise<DeliveryRow>;
}

async function claimAutoDelivery(
  prisma: PrismaClient,
  args: {
    invitation: NonNullable<InvitationEmailContext>;
    qrCodeId: string;
    subject: string;
    recipientEmail: string;
    createdBy?: string;
    expiresAt: Date | null;
    idempotencyKey: string;
  },
): Promise<AutoClaimResult> {
  const existing = await getExistingAutoDelivery(prisma, args.idempotencyKey);

  if (existing?.status === "SENT") {
    return { kind: "existing-sent", delivery: existing };
  }

  if (existing?.status === "PENDING") {
    return { kind: "in-progress", delivery: existing };
  }

  const emailAccessToken = buildEmailAccessToken();

  if (existing && (existing.status === "FAILED" || existing.status === "SKIPPED")) {
    const reclaimed = await prisma.qrEmailDelivery.updateMany({
      where: {
        id: existing.id,
        status: {
          in: [QrEmailDeliveryStatus.FAILED, QrEmailDeliveryStatus.SKIPPED],
        },
      },
      data: {
        status: QrEmailDeliveryStatus.PENDING,
        provider: "pending",
        recipient_email: args.recipientEmail,
        provider_message_id: null,
        subject: args.subject,
        email_access_token: emailAccessToken,
        failure_code: null,
        failure_message: null,
        sent_at: null,
        expires_at: args.expiresAt,
        created_by: args.createdBy ?? null,
      },
    });

    if (reclaimed.count === 1) {
      return {
        kind: "claimed",
        delivery: {
          ...existing,
          status: "PENDING",
          provider: "pending",
          recipient_email: args.recipientEmail,
          provider_message_id: null,
          failure_code: null,
          failure_message: null,
          sent_at: null,
          email_access_token: emailAccessToken,
          expires_at: args.expiresAt,
        },
      };
    }

    const current = await getExistingAutoDelivery(prisma, args.idempotencyKey);
    if (!current) {
      throw new Error(`Unable to recover AUTO QR email claim for ${args.idempotencyKey}`);
    }

    if (current.status === "SENT") {
      return { kind: "existing-sent", delivery: current };
    }

    if (current.status === "PENDING") {
      return { kind: "in-progress", delivery: current };
    }
  }

  try {
    const created = (await prisma.qrEmailDelivery.create({
      data: {
        property_id: args.invitation.property_id,
        invitation_id: args.invitation.id,
        visit_id: args.invitation.visit_id!,
        qr_code_id: args.qrCodeId,
        recipient_email: args.recipientEmail,
        trigger_type: QrEmailDeliveryTriggerType.AUTO,
        status: QrEmailDeliveryStatus.PENDING,
        provider: "pending",
        subject: args.subject,
        idempotency_key: args.idempotencyKey,
        email_access_token: emailAccessToken,
        expires_at: args.expiresAt,
        created_by: args.createdBy ?? null,
      },
      select: {
        id: true,
        recipient_email: true,
        provider: true,
        provider_message_id: true,
        failure_code: true,
        failure_message: true,
        sent_at: true,
        status: true,
        email_access_token: true,
        expires_at: true,
      },
    })) as DeliveryRow;

    return { kind: "claimed", delivery: created };
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const current = await getExistingAutoDelivery(prisma, args.idempotencyKey);
    if (!current) {
      throw error;
    }

    if (current.status === "SENT") {
      return { kind: "existing-sent", delivery: current };
    }

    if (current.status === "PENDING") {
      return { kind: "in-progress", delivery: current };
    }

    throw new Error(
      `AUTO QR email claim collision left non-terminal status for ${args.idempotencyKey}`,
    );
  }
}

export async function sendInvitationQrEmail(
  prisma: PrismaClient,
  params: QrEmailSendParams,
): Promise<QrEmailDeliverySummary> {
  const triggerType = params.triggerType ?? "AUTO";
  const invitation = await getInvitationEmailContext(prisma, params.invitationId);

  if (!invitation) {
    throw new Error(`Invitation not found: ${params.invitationId}`);
  }

  if (!invitation.visit_id || !invitation.visit) {
    throw new Error(`Invitation ${params.invitationId} is not linked to a visit`);
  }

  const qrCode = await prisma.qRCode.findFirst({
    where: {
      id: params.qrCodeId,
      property_id: invitation.property_id,
      visit_id: invitation.visit_id,
    },
    select: { id: true, expires_at: true },
  });

  if (!qrCode) {
    throw new Error(`QR code not found: ${params.qrCodeId}`);
  }

  const recipientEmail = invitation.visitor_email?.trim() ?? "";
  const subject = `Your visitor QR code for ${invitation.property.name} — ${invitation.visitor_name}`;
  const idempotencyKey = buildIdempotencyKey(triggerType, qrCode.id);
  const expiresAt = qrCode.expires_at ?? null;

  if (triggerType === "AUTO" && idempotencyKey) {
    const claimResult = await claimAutoDelivery(prisma, {
      invitation,
      qrCodeId: qrCode.id,
      subject,
      recipientEmail,
      createdBy: params.createdBy,
      expiresAt,
      idempotencyKey,
    });

    if (claimResult.kind === "existing-sent") {
      return buildExistingDeliverySummary(claimResult.delivery, triggerType);
    }

    if (claimResult.kind === "in-progress") {
      return buildInProgressSummary(claimResult.delivery, triggerType);
    }

    if (!isQrEmailEnabled()) {
      const updated = await finalizeClaimedDelivery(prisma, {
        deliveryId: claimResult.delivery.id,
        status: "SKIPPED",
        provider: "none",
        recipientEmail,
        failureCode: "QR_EMAIL_DISABLED",
        failureMessage: "QR email delivery is disabled",
      });
      return buildDeliverySummary(updated, triggerType, { attempted: false });
    }

    if (!recipientEmail) {
      const updated = await finalizeClaimedDelivery(prisma, {
        deliveryId: claimResult.delivery.id,
        status: "SKIPPED",
        provider: "none",
        recipientEmail,
        failureCode: "MISSING_RECIPIENT_EMAIL",
        failureMessage: "Invitation has no visitor email",
      });
      return buildDeliverySummary(updated, triggerType, { attempted: false });
    }

    let resolvedProvider = "unknown";

    try {
      const provider = getEmailProvider();
      resolvedProvider = provider.name;

      const qrAccessUrl = buildQrAccessUrl(claimResult.delivery.email_access_token || "");
      const qrImageUrl = buildQrImageUrl(claimResult.delivery.email_access_token || "");
      const template = buildVisitorQrEmailTemplate({
        visitorName: invitation.visitor_name,
        propertyName: invitation.property.name,
        unitLabel: buildUnitLabel(invitation.unit.unit_no, invitation.unit.floor),
        visitDateLabel: format(invitation.expected_date, "yyyy-MM-dd"),
        visitTimeLabel: invitation.expected_time || "Time to be confirmed",
        hostName: getHostName(invitation),
        hostRoleLabel: getHostRoleLabel(invitation),
        propertyAddress: invitation.property.address,
        qrAccessUrl,
        qrImageUrl,
        supportContact: invitation.inviter.email,
        notes: invitation.notes || undefined,
      });

      const sendResult = await provider.send({
        to: recipientEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        metadata: {
          invitationId: invitation.id,
          visitId: invitation.visit_id,
          qrCodeId: qrCode.id,
          triggerType,
        },
      });

      if (sendResult.success) {
        const updated = await finalizeClaimedDelivery(prisma, {
          deliveryId: claimResult.delivery.id,
          status: "SENT",
          provider: sendResult.provider,
          recipientEmail,
          providerMessageId: sendResult.messageId ?? null,
          sentAt: new Date(),
        });
        return buildDeliverySummary(updated, triggerType, { attempted: true });
      }

      const updated = await finalizeClaimedDelivery(prisma, {
        deliveryId: claimResult.delivery.id,
        status: "FAILED",
        provider: sendResult.provider,
        recipientEmail,
        failureCode: sendResult.errorCode ?? "QR_EMAIL_SEND_FAILED",
        failureMessage:
          sanitizeFailureMessage(sendResult.errorMessage, params.rawToken) ||
          "QR email delivery failed",
      });
      return buildDeliverySummary(updated, triggerType, { attempted: true });
    } catch (error) {
      const failureMessage = sanitizeFailureMessage(
        error instanceof Error ? error.message : "Unknown QR email delivery error",
        params.rawToken,
      );

      const updated = await finalizeClaimedDelivery(prisma, {
        deliveryId: claimResult.delivery.id,
        status: "FAILED",
        provider: resolvedProvider,
        recipientEmail,
        failureCode: "QR_EMAIL_SEND_FAILED",
        failureMessage: failureMessage || "QR email delivery failed",
      });
      return buildDeliverySummary(updated, triggerType, { attempted: true });
    }
  }

  const emailAccessToken = buildEmailAccessToken();

  if (!isQrEmailEnabled()) {
    return createDeliveryRecord(prisma, {
      invitation,
      qrCodeId: qrCode.id,
      triggerType,
      createdBy: params.createdBy,
      recipientEmail,
      status: "SKIPPED",
      provider: "none",
      subject,
      idempotencyKey,
      emailAccessToken,
      expiresAt,
      failureCode: "QR_EMAIL_DISABLED",
      failureMessage: "QR email delivery is disabled",
    });
  }

  if (!recipientEmail) {
    return createDeliveryRecord(prisma, {
      invitation,
      qrCodeId: qrCode.id,
      triggerType,
      createdBy: params.createdBy,
      recipientEmail,
      status: "SKIPPED",
      provider: "none",
      subject,
      idempotencyKey,
      emailAccessToken,
      expiresAt,
      failureCode: "MISSING_RECIPIENT_EMAIL",
      failureMessage: "Invitation has no visitor email",
    });
  }

  let resolvedProvider = "unknown";

  try {
    const provider = getEmailProvider();
    resolvedProvider = provider.name;

    const qrAccessUrl = buildQrAccessUrl(emailAccessToken);
    const qrImageUrl = buildQrImageUrl(emailAccessToken);
    const template = buildVisitorQrEmailTemplate({
      visitorName: invitation.visitor_name,
      propertyName: invitation.property.name,
      unitLabel: buildUnitLabel(invitation.unit.unit_no, invitation.unit.floor),
      visitDateLabel: format(invitation.expected_date, "yyyy-MM-dd"),
      visitTimeLabel: invitation.expected_time || "Time to be confirmed",
      hostName: getHostName(invitation),
      hostRoleLabel: getHostRoleLabel(invitation),
      propertyAddress: invitation.property.address,
      qrAccessUrl,
      qrImageUrl,
      supportContact: invitation.inviter.email,
      notes: invitation.notes || undefined,
    });

    const sendResult = await provider.send({
      to: recipientEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
      metadata: {
        invitationId: invitation.id,
        visitId: invitation.visit_id,
        qrCodeId: qrCode.id,
        triggerType,
      },
    });

    if (sendResult.success) {
      return createDeliveryRecord(prisma, {
        invitation,
        qrCodeId: qrCode.id,
        triggerType,
        createdBy: params.createdBy,
        recipientEmail,
        status: "SENT",
        provider: sendResult.provider,
        subject: template.subject,
        idempotencyKey,
        emailAccessToken,
        expiresAt,
        providerMessageId: sendResult.messageId ?? null,
        sentAt: new Date(),
      });
    }

    return createDeliveryRecord(prisma, {
      invitation,
      qrCodeId: qrCode.id,
      triggerType,
      createdBy: params.createdBy,
      recipientEmail,
      status: "FAILED",
      provider: sendResult.provider,
      subject: template.subject,
      idempotencyKey,
      emailAccessToken,
      expiresAt,
      failureCode: sendResult.errorCode ?? "QR_EMAIL_SEND_FAILED",
      failureMessage:
        sanitizeFailureMessage(sendResult.errorMessage, params.rawToken) ||
        "QR email delivery failed",
    });
  } catch (error) {
    const failureMessage = sanitizeFailureMessage(
      error instanceof Error ? error.message : "Unknown QR email delivery error",
      params.rawToken,
    );

    return createDeliveryRecord(prisma, {
      invitation,
      qrCodeId: qrCode.id,
      triggerType,
      createdBy: params.createdBy,
      recipientEmail,
      status: "FAILED",
      provider: resolvedProvider,
      subject,
      idempotencyKey,
      emailAccessToken,
      expiresAt,
      failureCode: "QR_EMAIL_SEND_FAILED",
      failureMessage: failureMessage || "QR email delivery failed",
    });
  }
}
