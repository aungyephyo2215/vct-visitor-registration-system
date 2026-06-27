import type { PrismaClient } from "@/generated/prisma/client";
import { hashToken } from "@/lib/crypto";

/**
 * Input token formats supported by the resolver:
 *
 * 1. Raw QR token (base64url, 32 bytes)
 * 2. Full QR access URL
 * 3. Email access token (UUID v4)
 */

type QrCodeWithVisit = {
  id: string;
  property_id: string;
  visit_id: string;
  status: string;
  expires_at: Date;
  used_at: Date | null;
  revoked_at: Date | null;
  visit: {
    id: string;
    property_id: string;
    visitor_id: string | null;
    unit_id: string;
    host_user_id: string | null;
    purpose: string;
    notes: string | null;
    expected_checkin_time: Date | null;
    status: string;
    checkin_time: Date | null;
    checkout_time: Date | null;
    property: { id: string; name: string };
    visitor: {
      id: string;
      name: string;
      phone: string;
      id_type: string;
      id_number: string | null;
      photo_url: string | null;
    } | null;
    verification: {
      id: string;
      photo_url: string | null;
      vehicle_number: string | null;
      nda_signed: boolean;
      safety_form_signed: boolean;
    } | null;
    unit: { id: string; unit_no: string; floor: number };
    host: { id: string; name: string } | null;
    invitations: {
      id: string;
      visitor_name: string;
      visitor_phone: string;
      visitor_type: string;
      status: string;
      expected_date: Date;
      expected_time: string | null;
    }[];
  };
};

export function extractToken(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const urlMatch = trimmed.match(/\/qr-access\/([^/?#]+)/);
  if (urlMatch) {
    return decodeURIComponent(urlMatch[1]);
  }

  return trimmed;
}

function isUuidFormat(token: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
}

const qrCodeLookupSelect = {
  id: true,
  property_id: true,
  visit_id: true,
  status: true,
  expires_at: true,
  used_at: true,
  revoked_at: true,
  visit: {
    select: {
      id: true,
      property_id: true,
      visitor_id: true,
      unit_id: true,
      host_user_id: true,
      purpose: true,
      notes: true,
      expected_checkin_time: true,
      status: true,
      checkin_time: true,
      checkout_time: true,
      property: { select: { id: true, name: true } },
      visitor: {
        select: {
          id: true,
          name: true,
          phone: true,
          id_type: true,
          id_number: true,
          photo_url: true,
        },
      },
      verification: {
        select: {
          id: true,
          photo_url: true,
          vehicle_number: true,
          nda_signed: true,
          safety_form_signed: true,
        },
      },
      unit: { select: { id: true, unit_no: true, floor: true } },
      host: { select: { id: true, name: true } },
      invitations: {
        select: {
          id: true,
          visitor_name: true,
          visitor_phone: true,
          visitor_type: true,
          status: true,
          expected_date: true,
          expected_time: true,
        },
      },
    },
  },
} as const;

async function lookupByQrToken(
  prisma: PrismaClient,
  rawToken: string,
): Promise<QrCodeWithVisit | null> {
  const tokenHash = hashToken(rawToken);

  return prisma.qRCode.findUnique({
    where: { token_hash: tokenHash },
    select: qrCodeLookupSelect,
  });
}

async function lookupByEmailToken(
  prisma: PrismaClient,
  emailToken: string,
): Promise<QrCodeWithVisit | null> {
  const tokenHash = hashToken(emailToken);

  const delivery = await prisma.qrEmailDelivery.findUnique({
    where: { email_access_token_hash: tokenHash },
    select: {
      id: true,
      status: true,
      expires_at: true,
      qr_code_id: true,
    },
  });

  if (!delivery) return null;

  return prisma.qRCode.findUnique({
    where: { id: delivery.qr_code_id },
    select: qrCodeLookupSelect,
  });
}

export async function resolveQrToken(
  prisma: PrismaClient,
  input: string,
): Promise<QrCodeWithVisit | null> {
  const token = extractToken(input);
  if (!token) return null;

  const isUuid = isUuidFormat(token);

  if (isUuid) {
    const result = await lookupByEmailToken(prisma, token);
    if (result) return result;
    return lookupByQrToken(prisma, token);
  }

  const result = await lookupByQrToken(prisma, token);
  if (result) return result;
  return lookupByEmailToken(prisma, token);
}
