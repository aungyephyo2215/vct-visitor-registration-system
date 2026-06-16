import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { requirePropertyAccess } from "@/lib/rbac";

export async function GET(
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

    const approvals = await prisma.approval.findMany({
      where: { invitation_id: id },
      orderBy: { created_at: "desc" },
      include: {
        approver: { select: { id: true, name: true } },
      },
    });

    return successResponse(approvals);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("List approvals error:", error);
    return errorResponse("Internal server error", 500);
  }
}
