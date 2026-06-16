import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { requirePropertyAccess, requireRole } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    requireRole(user, "SUPER_ADMIN", "PROPERTY_ADMIN", "OFFICE_STAFF");
    const { id } = await params;

    const invitation = await prisma.invitation.findFirst({
      where: { id, deleted_at: null },
    });

    if (!invitation) return notFoundResponse("Invitation not found");

    requirePropertyAccess(user, invitation.property_id);

    if (invitation.status !== "PENDING") {
      return errorResponse(`Invitation is ${invitation.status.toLowerCase()}, not pending`, 400);
    }

    // Create approval record and update invitation in a transaction
    const [updated] = await prisma.$transaction([
      prisma.invitation.update({
        where: { id },
        data: {
          status: "APPROVED",
          approved_by: user.id,
          approved_at: new Date(),
        },
        include: {
          inviter: { select: { id: true, name: true } },
          approver: { select: { id: true, name: true } },
          unit: { select: { id: true, unit_no: true, floor: true } },
        },
      }),
      prisma.approval.create({
        data: {
          invitation_id: id,
          status: "APPROVED",
          approved_by: user.id,
        },
      }),
    ]);

    await createAuditLog({
      prisma,
      property_id: invitation.property_id,
      user_id: user.id,
      action: "APPROVE_INVITATION",
      resource_type: "invitation",
      resource_id: id,
      ip_address: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Approve invitation error:", error);
    return errorResponse("Internal server error", 500);
  }
}
