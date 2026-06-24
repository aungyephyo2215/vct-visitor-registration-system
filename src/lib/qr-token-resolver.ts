import type { PrismaClient } from "@/generated/prisma/client";
import { hashToken } from "@/lib/crypto";

/**
 * Input token formats supported by the resolver:
 *
 * 1. Raw QR token (base64url, 32 bytes)
 *    Example: "aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789_-"
 *
 * 2. Full QR access URL
 *    Example: "https://domain.com/qr-access/550e8400-e29b-41d4-a716-446655440000"
 *
 * 3. Email access token (UUID v4)
 *    Example: "550e8400-e29b-41d4-a716-446655440000"
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
    status: string;
    checkin_time: Date | null;
    checkout_time: Date | null;
    visitor: { id: string; name: string; phone: string; id_number: string | null } | null;
    verification: { id: string } | null;
    unit: { id: string; unit_no: string; floor: number };
    host: { id: string; name: string } | null;
    invitations: {
      id: string;
      visitor_name: string;
      visitor_phone: string;
      visitor_type: string;
      status: string;
    }[];
  };
};

/**
 * Extract a token from user input.
 * Handles: raw token, full URL with /qr-access/ path, or UUID.
 */
export function extractToken(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  // Try to extract token from URL: https://domain.com/qr-access/{token}
  const urlMatch = trimmed.match(/\/qr-access\/([^/?#]+)/);
  if (urlMatch) {
    return decodeURIComponent(urlMatch[1]);
  }

  return trimmed;
}

/**
 * Determine if a token looks like a UUID (email access token format).
 */
function isUuidFormat(token: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
}

/**
 * Look up a QR code by raw token hash.
 */
async function lookupByQrToken(
  prisma: PrismaClient,
  rawToken: string,
): Promise<QrCodeWithVisit | null> {
  const tokenHash = hashToken(rawToken);

  return prisma.qRCode.findUnique({
    where: { token_hash: tokenHash },
    include: {
      visit: {
        include: {
          visitor: { select: { id: true, name: true, phone: true, id_number: true } },
          verification: { select: { id: true } },
          unit: { select: { id: true, unit_no: true, floor: true } },
          host: { select: { id: true, name: true } },
          invitations: {
            select: {
              id: true,
              visitor_name: true,
              visitor_phone: true,
              visitor_type: true,
              status: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Look up a QR code via email access token.
 * Finds the delivery record by email_access_token_hash, then returns the associated QR code.
 */
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

  // Look up the QR code via the delivery's qr_code_id
  return prisma.qRCode.findUnique({
    where: { id: delivery.qr_code_id },
    include: {
      visit: {
        include: {
          visitor: { select: { id: true, name: true, phone: true, id_number: true } },
          verification: { select: { id: true } },
          unit: { select: { id: true, unit_no: true, floor: true } },
          host: { select: { id: true, name: true } },
          invitations: {
            select: {
              id: true,
              visitor_name: true,
              visitor_phone: true,
              visitor_type: true,
              status: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Resolve a QR code from user input.
 *
 * Supports three input formats:
 * 1. Raw QR token (base64url) — looked up directly by token_hash
 * 2. Full URL containing /qr-access/{token} — token extracted, then looked up
 * 3. Email access token (UUID) — looked up via email_access_token_hash
 *
 * Strategy:
 * - Extract token from input (handles URLs)
 * - If token looks like UUID, try email access token lookup first
 * - Otherwise, try raw QR token lookup first
 * - If first lookup fails, try the other
 *
 * @returns QR code with visit data, or null if not found
 */
export async function resolveQrToken(
  prisma: PrismaClient,
  input: string,
): Promise<QrCodeWithVisit | null> {
  const token = extractToken(input);
  if (!token) return null;

  const isUuid = isUuidFormat(token);

  if (isUuid) {
    // UUID format: try email token first, then raw token
    const result = await lookupByEmailToken(prisma, token);
    if (result) return result;
    return lookupByQrToken(prisma, token);
  }

  // Non-UUID format: try raw token first, then email token
  const result = await lookupByQrToken(prisma, token);
  if (result) return result;
  return lookupByEmailToken(prisma, token);
}
