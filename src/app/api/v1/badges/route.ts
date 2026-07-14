import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requirePropertyAccess, requireRole } from "@/lib/rbac";

const BADGE_ROLES = ["SUPER_ADMIN", "PROPERTY_ADMIN", "OFFICE_STAFF", "SECURITY_GUARD"] as const;

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    requireRole(user, ...BADGE_ROLES);

    const { searchParams } = new URL(request.url);
    const invitation_id = searchParams.get("invitation_id");
    const visit_id = searchParams.get("visit_id");
    const visitor_id = searchParams.get("visitor_id");

    const where: Record<string, unknown> = {};

    if (user.role !== "SUPER_ADMIN" && user.property_id) {
      where.property_id = user.property_id;
    }

    if (invitation_id) where.invitation_id = invitation_id;
    if (visit_id) where.visit_id = visit_id;
    if (visitor_id) where.visitor_id = visitor_id;

    const badges = await prisma.badge.findMany({
      where,
      orderBy: { generated_at: "desc" },
      include: {
        invitation: {
          select: {
            visitor_name: true,
            visitor_type: true,
            unit: { select: { unit_no: true, floor: true } },
          },
        },
      },
    });

    return successResponse(badges);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("List badges error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    requireRole(user, "SUPER_ADMIN", "PROPERTY_ADMIN", "OFFICE_STAFF", "SECURITY_GUARD");

    const body = await request.json();
    const { invitation_id } = body;

    if (!invitation_id) {
      return errorResponse("invitation_id is required", 400);
    }

    const invitation = await prisma.invitation.findFirst({
      where: { id: invitation_id, deleted_at: null },
      include: { visit: { select: { id: true } } },
    });

    if (!invitation) return errorResponse("Invitation not found", 404);

    requirePropertyAccess(user, invitation.property_id);

    if (invitation.status !== "APPROVED") {
      return errorResponse("Invitation must be APPROVED to generate badge", 400);
    }

    const badge = await prisma.badge.create({
      data: {
        property_id: invitation.property_id,
        invitation_id: invitation.id,
        visit_id: invitation.visit_id,
        visitor_id: null,
        badge_type: invitation.visitor_type,
        badge_data: {
          visitor_name: invitation.visitor_name,
          visitor_phone: invitation.visitor_phone,
          visitor_type: invitation.visitor_type,
          unit_no: null,
          expected_date: invitation.expected_date,
          status: invitation.status,
        },
      },
    });

    return successResponse(badge, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", 400);
    }
    console.error("Generate badge error:", error);
    return errorResponse("Internal server error", 500);
  }
}
