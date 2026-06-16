import type { PrismaClient } from "@/generated/prisma/client";

type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "CREATE_VISITOR"
  | "UPDATE_VISITOR"
  | "DELETE_VISITOR"
  | "CREATE_VISIT"
  | "UPDATE_VISIT"
  | "GENERATE_QR"
  | "CHECK_IN"
  | "CHECK_OUT"
  | "FAILED_QR_SCAN"
  | "MANUAL_CHECKOUT"
  | "BLOCKLIST_MATCH";

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

let _defaultPropertyId: string | null = null;

async function getDefaultPropertyId(prisma: PrismaClient): Promise<string> {
  if (!_defaultPropertyId) {
    const property = await prisma.property.findFirst({ where: { status: "ACTIVE" } });
    _defaultPropertyId = property?.id || "seed-property-01";
  }
  return _defaultPropertyId;
}

export async function createAuditLog(params: CreateAuditLogParams) {
  const property_id =
    params.property_id || (await getDefaultPropertyId(params.prisma));

  return params.prisma.auditLog.create({
    data: {
      property_id,
      user_id: params.user_id || null,
      action: params.action,
      resource_type: params.resource_type,
      resource_id: params.resource_id || null,
      ip_address: params.ip_address || "unknown",
      user_agent: params.user_agent || "unknown",
      metadata: params.metadata as any,
    },
  });
}
