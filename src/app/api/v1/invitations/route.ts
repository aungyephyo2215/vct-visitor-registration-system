import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, validationErrorResponse } from "@/lib/api-response";
import { invitationCreateSchema, paginationSchema, formatZodErrors } from "@/lib/validations";
import { requirePropertyAccess, requireRole } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { expireStaleInvitations } from "@/lib/invitation-expire";
import { sendBulkNotifications, getApproverRecipients } from "@/lib/notifications/service";
import type { IdType, VisitorType } from "@/generated/prisma/enums";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    // Auto-expire stale PENDING invitations before listing
    await expireStaleInvitations(prisma);

    const { searchParams } = new URL(request.url);
    const query = paginationSchema.safeParse(Object.fromEntries(searchParams));

    if (!query.success) {
      return validationErrorResponse(formatZodErrors(query.error));
    }

    const { page, limit, search, status } = query.data;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deleted_at: null };

    // RESIDENT sees only own invitations; others see all in property
    if (user.role === "RESIDENT") {
      where.invited_by = user.id;
    } else if (user.role !== "SUPER_ADMIN") {
      where.property_id = user.property_id;
    }

    if (status) where.status = status;

    if (search) {
      where.OR = [
        { visitor_name: { contains: search, mode: "insensitive" } },
        { visitor_phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [invitations, total] = await Promise.all([
      prisma.invitation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          inviter: { select: { id: true, name: true, email: true } },
          approver: { select: { id: true, name: true } },
          unit: { select: { id: true, unit_no: true, floor: true } },
        },
      }),
      prisma.invitation.count({ where }),
    ]);

    return successResponse({
      data: invitations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("List invitations error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    requireRole(user, "SUPER_ADMIN", "PROPERTY_ADMIN", "RESIDENT");
    const body = await request.json();
    const parsed = invitationCreateSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(formatZodErrors(parsed.error));
    }

    // Resolve property_id: SUPER_ADMIN has none, so derive from unit.
    // For scoped users, validate the unit belongs to their property.
    let property_id: string;

    if (user.property_id) {
      // Scoped user — validate the unit belongs to their property
      property_id = user.property_id;
      const unit = await prisma.unit.findFirst({
        where: { id: parsed.data.unit_id, property_id, deleted_at: null },
      });
      if (!unit) return errorResponse("Unit not found in this property", 404);
    } else {
      // SUPER_ADMIN — resolve property from unit
      const unit = await prisma.unit.findFirst({
        where: { id: parsed.data.unit_id, deleted_at: null },
        select: { property_id: true },
      });
      if (!unit) return errorResponse("Unit not found", 404);
      property_id = unit.property_id;
    }

    const invitation = await prisma.invitation.create({
      data: {
        property_id,
        invited_by: user.id,
        visitor_name: parsed.data.visitor_name,
        visitor_phone: parsed.data.visitor_phone,
        visitor_email: parsed.data.visitor_email || null,
        visitor_id_type: (parsed.data.visitor_id_type as IdType) || null,
        visitor_id_number: parsed.data.visitor_id_number || null,
        visitor_type: parsed.data.visitor_type as VisitorType,
        unit_id: parsed.data.unit_id,
        expected_date: new Date(parsed.data.expected_date),
        expected_time: parsed.data.expected_time || null,
        notes: parsed.data.notes || null,
        status: "PENDING",
      },
      include: {
        inviter: { select: { id: true, name: true } },
        unit: { select: { id: true, unit_no: true, floor: true } },
      },
    });

    await createAuditLog({
      prisma,
      property_id,
      user_id: user.id,
      action: "CREATE_INVITATION",
      resource_type: "invitation",
      resource_id: invitation.id,
      ip_address: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
    });

    // Fire-and-forget notification to all approvers
    try {
      const approverIds = await getApproverRecipients(prisma, property_id);
      await sendBulkNotifications(
        prisma,
        approverIds,
        "INVITATION_CREATED",
        {
          inviter: user.name,
          visitor: parsed.data.visitor_name,
          type: parsed.data.visitor_type,
        },
        property_id,
        invitation.id,
      );
    } catch (notifError) {
      console.error("Failed to send invitation notifications:", notifError);
    }

    return successResponse(invitation, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", 400);
    }
    console.error("Create invitation error:", error);
    return errorResponse("Internal server error", 500);
  }
}
