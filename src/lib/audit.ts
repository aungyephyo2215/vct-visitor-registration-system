import type { PrismaClient } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";

type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "CREATE_VISITOR"
  | "UPDATE_VISITOR"
  | "DELETE_VISITOR"
  | "CREATE_VISIT"
  | "UPDATE_VISIT"
  | "GENERATE_QR"
  | "MANUAL_RESEND_QR_EMAIL"
  | "CHECK_IN"
  | "CHECK_OUT"
  | "FAILED_QR_SCAN"
  | "MANUAL_CHECKOUT"
  | "BLOCKLIST_MATCH"
  | "CREATE_INVITATION"
  | "UPDATE_INVITATION"
  | "DELETE_INVITATION"
  | "APPROVE_INVITATION"
  | "REJECT_INVITATION"
  | "VERIFY_VISITOR"
  | "ATTACH_VISITOR"
  | "CREATE_VEHICLE"
  | "UPDATE_VEHICLE"
  | "DELETE_VEHICLE"
  | "BLOCK_VEHICLE";

interface CreateAuditLogParams {
  prisma: PrismaClient;
  property_id?: string | null;
  user_id?: string | null;
  action: AuditAction;
  resource_type: string;
  resource_id?: string | null;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
}

async function getDefaultPropertyId(prisma: PrismaClient): Promise<string | null> {
  const property = await prisma.property.findFirst({ where: { status: "ACTIVE" } });
  return property?.id ?? null;
}

export async function createAuditLog(params: CreateAuditLogParams) {
  // Resolve property_id — if none provided, try to find the first active property
  const property_id = params.property_id || (await getDefaultPropertyId(params.prisma));

  // If still no valid property_id, skip audit log silently.
  // This prevents a FK violation when SUPER_ADMIN users have no property assigned.
  if (!property_id) {
    console.warn(
      `[audit] Skipping audit log — no valid property_id for action: ${params.action} user: ${params.user_id}`,
    );
    return null;
  }

  return params.prisma.auditLog.create({
    data: {
      property_id,
      user_id: params.user_id || null,
      action: params.action,
      resource_type: params.resource_type,
      resource_id: params.resource_id || null,
      ip_address: params.ip_address || "unknown",
      user_agent: params.user_agent || "unknown",
      metadata: params.metadata as Prisma.InputJsonValue,
    },
  });
}
