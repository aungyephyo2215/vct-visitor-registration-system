import { format } from "date-fns";

import type { PrismaClient } from "@/generated/prisma/client";
import { hashToken } from "@/lib/crypto";

type PublicQrAccessRecord = {
  emailAccessToken: string;
  visitorName: string;
  propertyName: string;
  propertyAddress: string | null;
  unitLabel: string;
  hostName: string;
  visitDateLabel: string;
  visitTimeLabel: string;
  qrImageUrl: string;
  qrPayloadUrl: string;
};

function getBaseUrl(): string {
  return (
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000"
  );
}

function buildUnitLabel(unitNo: string, floor?: number | null): string {
  if (floor == null) return `Unit ${unitNo}`;
  return `Floor ${floor} / Unit ${unitNo}`;
}

function buildQrAccessUrl(emailAccessToken: string): string {
  return `${getBaseUrl()}/qr-access/${encodeURIComponent(emailAccessToken)}`;
}

function buildQrImageUrl(emailAccessToken: string): string {
  return `${getBaseUrl()}/api/v1/qr/email-image/${encodeURIComponent(emailAccessToken)}`;
}

export async function resolvePublicQrAccessByToken(
  prisma: PrismaClient,
  emailAccessToken: string,
  now = new Date(),
): Promise<PublicQrAccessRecord | null> {
  const token = emailAccessToken.trim();
  if (!token) return null;

  const tokenHash = hashToken(token);

  const delivery = await prisma.qrEmailDelivery.findUnique({
    where: { email_access_token_hash: tokenHash },
    select: {
      email_access_token_hash: true,
      status: true,
      expires_at: true,
      invitation: {
        select: {
          id: true,
          visitor_name: true,
          expected_date: true,
          expected_time: true,
          status: true,
          deleted_at: true,
          property: { select: { id: true, name: true, address: true } },
          unit: { select: { id: true, unit_no: true, floor: true } },
        },
      },
      visit: {
        select: {
          id: true,
          status: true,
          host: { select: { id: true, name: true } },
        },
      },
      qrCode: {
        select: {
          id: true,
          status: true,
          expires_at: true,
          used_at: true,
          revoked_at: true,
        },
      },
    },
  });

  if (!delivery?.email_access_token_hash) return null;
  if (delivery.status !== "SENT") return null;
  if (!delivery.expires_at || delivery.expires_at <= now) return null;
  if (delivery.invitation.deleted_at) return null;
  if (delivery.invitation.status !== "APPROVED") return null;
  if (delivery.visit.status !== "EXPECTED") return null;
  if (delivery.qrCode.status !== "ACTIVE") return null;
  if (delivery.qrCode.used_at || delivery.qrCode.revoked_at) return null;
  if (delivery.qrCode.expires_at <= now) return null;

  return {
    emailAccessToken: token,
    visitorName: delivery.invitation.visitor_name,
    propertyName: delivery.invitation.property.name,
    propertyAddress: delivery.invitation.property.address,
    unitLabel: buildUnitLabel(delivery.invitation.unit.unit_no, delivery.invitation.unit.floor),
    hostName: delivery.visit.host?.name || "Host",
    visitDateLabel: format(delivery.invitation.expected_date, "yyyy-MM-dd"),
    visitTimeLabel: delivery.invitation.expected_time || "Time to be confirmed",
    qrImageUrl: buildQrImageUrl(token),
    qrPayloadUrl: buildQrAccessUrl(token),
  };
}
