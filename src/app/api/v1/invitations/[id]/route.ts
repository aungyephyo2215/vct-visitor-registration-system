import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from "@/lib/api-response";
import { invitationUpdateSchema, formatZodErrors } from "@/lib/validations";
import { requirePropertyAccess, requireRole } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

async function findInvitation(id: string) {
  return prisma.invitation.findFirst({
    where: { id, deleted_at: null },
    include: {
      inviter: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true } },
      unit: { select: { id: true, unit_no: true, floor: true } },
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const invitation = await findInvitation(id);

    if (!invitation) return notFoundResponse("Invitation not found");

    requirePropertyAccess(user, invitation.property_id);

    // RESIDENT can only view own invitations
    if (user.role === "RESIDENT" && invitation.invited_by !== user.id) {
      return errorResponse("Not authorized", 403);
    }

    return successResponse(invitation);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Get invitation error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const invitation = await findInvitation(id);

    if (!invitation) return notFoundResponse("Invitation not found");

    requirePropertyAccess(user, invitation.property_id);

    // Only creator, PROPERTY_ADMIN, SUPER_ADMIN can update
    if (user.role === "RESIDENT" && invitation.invited_by !== user.id) {
      return errorResponse("Not authorized", 403);
    }

    // Cannot update non-pending invitations
    if (invitation.status !== "PENDING") {
      return errorResponse("Only pending invitations can be edited", 400);
    }

    const body = await request.json();
    const parsed = invitationUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(formatZodErrors(parsed.error));
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.visitor_name) updateData.visitor_name = parsed.data.visitor_name;
    if (parsed.data.visitor_phone) updateData.visitor_phone = parsed.data.visitor_phone;
    if (parsed.data.visitor_email !== undefined) updateData.visitor_email = parsed.data.visitor_email;
    if (parsed.data.visitor_id_type !== undefined) updateData.visitor_id_type = parsed.data.visitor_id_type;
    if (parsed.data.visitor_id_number !== undefined) updateData.visitor_id_number = parsed.data.visitor_id_number;
    if (parsed.data.visitor_type) updateData.visitor_type = parsed.data.visitor_type;
    if (parsed.data.unit_id) {
      const unit = await prisma.unit.findFirst({
        where: { id: parsed.data.unit_id, property_id: invitation.property_id, deleted_at: null },
      });
      if (!unit) return errorResponse("Unit not found in this property", 404);
      updateData.unit_id = parsed.data.unit_id;
    }
    if (parsed.data.expected_date) updateData.expected_date = new Date(parsed.data.expected_date);
    if (parsed.data.expected_time !== undefined) updateData.expected_time = parsed.data.expected_time;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
    if (parsed.data.status) updateData.status = parsed.data.status;

    const updated = await prisma.invitation.update({
      where: { id },
      data: updateData,
      include: {
        inviter: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
        unit: { select: { id: true, unit_no: true, floor: true } },
      },
    });

    await createAuditLog({
      prisma,
      property_id: invitation.property_id,
      user_id: user.id,
      action: "UPDATE_INVITATION",
      resource_type: "invitation",
      resource_id: id,
      ip_address: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
      metadata: { changes: Object.keys(updateData) },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", 400);
    }
    console.error("Update invitation error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const invitation = await prisma.invitation.findFirst({
      where: { id, deleted_at: null },
    });

    if (!invitation) return notFoundResponse("Invitation not found");

    requirePropertyAccess(user, invitation.property_id);

    // Only creator, PROPERTY_ADMIN, SUPER_ADMIN can delete
    if (user.role === "RESIDENT" && invitation.invited_by !== user.id) {
      return errorResponse("Not authorized", 403);
    }

    // Soft delete
    await prisma.invitation.update({
      where: { id },
      data: { deleted_at: new Date(), status: "CANCELLED" },
    });

    await createAuditLog({
      prisma,
      property_id: invitation.property_id,
      user_id: user.id,
      action: "DELETE_INVITATION",
      resource_type: "invitation",
      resource_id: id,
      ip_address: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
    });

    return successResponse({ message: "Invitation cancelled" });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Delete invitation error:", error);
    return errorResponse("Internal server error", 500);
  }
}
