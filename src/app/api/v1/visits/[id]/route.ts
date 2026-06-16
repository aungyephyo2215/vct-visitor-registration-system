import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from "@/lib/api-response";
import { visitUpdateSchema, formatZodErrors } from "@/lib/validations";
import { requirePropertyAccess, requireRole } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

const visitIncludes = {
  visitor: { select: { id: true, name: true, phone: true, id_type: true, id_number: true } },
  unit: { select: { id: true, unit_no: true, floor: true } },
  host: { select: { id: true, name: true, email: true } },
  qrCodes: { select: { id: true, status: true, expires_at: true } },
  verification: {
    select: {
      id: true, photo_url: true, vehicle_number: true,
      nda_signed: true, safety_form_signed: true, verified_at: true,
      verifier: { select: { name: true } },
    },
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    requireRole(user, "SUPER_ADMIN", "PROPERTY_ADMIN", "SECURITY_GUARD", "OFFICE_STAFF");
    const { id } = await params;

    const visit = await prisma.visit.findFirst({
      where: { id, deleted_at: null },
      include: visitIncludes,
    });

    if (!visit) return notFoundResponse("Visit not found");

    requirePropertyAccess(user, visit.property_id);

    return successResponse(visit);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Get visit error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    requireRole(user, "SUPER_ADMIN", "PROPERTY_ADMIN", "SECURITY_GUARD", "OFFICE_STAFF");
    const { id } = await params;

    const visit = await prisma.visit.findFirst({
      where: { id, deleted_at: null },
    });

    if (!visit) return notFoundResponse("Visit not found");

    requirePropertyAccess(user, visit.property_id);

    const body = await request.json();
    const parsed = visitUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(formatZodErrors(parsed.error));
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.data.visitor_id) {
      const newVisitor = await prisma.visitor.findFirst({
        where: { id: parsed.data.visitor_id, property_id: visit.property_id, deleted_at: null },
      });
      if (!newVisitor) return errorResponse("Visitor not found in this property", 404);
      updateData.visitor_id = parsed.data.visitor_id;
    }
    if (parsed.data.unit_id) {
      const unit = await prisma.unit.findFirst({
        where: { id: parsed.data.unit_id, property_id: visit.property_id, deleted_at: null },
      });
      if (!unit) return errorResponse("Unit not found in this property", 404);
      updateData.unit_id = parsed.data.unit_id;
    }
    if (parsed.data.host_user_id !== undefined) {
      if (parsed.data.host_user_id === null) {
        updateData.host_user_id = null;
      } else {
        const host = await prisma.user.findFirst({
          where: { id: parsed.data.host_user_id, property_id: visit.property_id, deleted_at: null },
        });
        if (!host) return errorResponse("Host user not found in this property", 404);
        updateData.host_user_id = parsed.data.host_user_id;
      }
    }
    if (parsed.data.purpose) updateData.purpose = parsed.data.purpose;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
    if (parsed.data.vehicle_number !== undefined) updateData.vehicle_number = parsed.data.vehicle_number;
    if (parsed.data.expected_checkin_time !== undefined) {
      updateData.expected_checkin_time = parsed.data.expected_checkin_time
        ? new Date(parsed.data.expected_checkin_time)
        : null;
    }
    if (parsed.data.status) updateData.status = parsed.data.status;

    const updated = await prisma.visit.update({
      where: { id },
      data: updateData,
      include: visitIncludes,
    });

    await createAuditLog({
      prisma,
      property_id: visit.property_id,
      user_id: user.id,
      action: "UPDATE_VISIT",
      resource_type: "visit",
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
    console.error("Update visit error:", error);
    return errorResponse("Internal server error", 500);
  }
}
