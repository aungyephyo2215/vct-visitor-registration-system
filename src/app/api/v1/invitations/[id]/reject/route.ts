import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from "@/lib/api-response";
import { invitationRejectSchema, formatZodErrors } from "@/lib/validations";
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

    const body = await request.json();
    const parsed = invitationRejectSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(formatZodErrors(parsed.error));
    }

    const [updated] = await prisma.$transaction([
      prisma.invitation.update({
        where: { id },
        data: {
          status: "REJECTED",
          approved_by: user.id,
          approved_at: new Date(),
          reason: parsed.data.reason,
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
          status: "REJECTED",
          approved_by: user.id,
          note: parsed.data.reason,
        },
      }),
    ]);

    await createAuditLog({
      prisma,
      property_id: invitation.property_id,
      user_id: user.id,
      action: "REJECT_INVITATION",
      resource_type: "invitation",
      resource_id: id,
      ip_address: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", 400);
    }
    console.error("Reject invitation error:", error);
    return errorResponse("Internal server error", 500);
  }
}
