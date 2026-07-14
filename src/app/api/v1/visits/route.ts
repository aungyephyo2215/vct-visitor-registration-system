import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, validationErrorResponse } from "@/lib/api-response";
import { visitCreateSchema, paginationSchema, formatZodErrors } from "@/lib/validations";
import { requirePropertyAccess, requireRole } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    requireRole(user, "SUPER_ADMIN", "PROPERTY_ADMIN", "SECURITY_GUARD", "OFFICE_STAFF");
    const { searchParams } = new URL(request.url);
    const query = paginationSchema.safeParse(Object.fromEntries(searchParams));

    if (!query.success) {
      return validationErrorResponse(formatZodErrors(query.error));
    }

    const { page, limit, status, visitor_id, unit_id } = query.data;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deleted_at: null };

    if (user.role !== "SUPER_ADMIN") {
      where.property_id = user.property_id;
    }

    if (status) where.status = status;
    if (visitor_id) where.visitor_id = visitor_id;
    if (unit_id) where.unit_id = unit_id;

    const [visits, total] = await Promise.all([
      prisma.visit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          visitor: {
            select: { id: true, name: true, phone: true, id_type: true, id_number: true },
          },
          unit: {
            select: { id: true, unit_no: true, floor: true },
          },
          host: {
            select: { id: true, name: true, email: true },
          },
          qrCodes: {
            select: { id: true, status: true, expires_at: true },
          },
        },
      }),
      prisma.visit.count({ where }),
    ]);

    return successResponse({
      data: visits,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("List visits error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    requireRole(user, "SUPER_ADMIN", "PROPERTY_ADMIN", "SECURITY_GUARD", "OFFICE_STAFF");
    const body = await request.json();
    const parsed = visitCreateSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(formatZodErrors(parsed.error));
    }

    const {
      visitor_id,
      unit_id,
      host_user_id,
      purpose,
      notes,
      vehicle_number,
      expected_checkin_time,
    } = parsed.data;

    const visitor = await prisma.visitor.findFirst({
      where: { id: visitor_id, deleted_at: null },
    });

    if (!visitor) return errorResponse("Visitor not found", 404);

    requirePropertyAccess(user, visitor.property_id);

    const property_id = visitor.property_id;

    const unit = await prisma.unit.findFirst({
      where: { id: unit_id, property_id, deleted_at: null },
    });

    if (!unit) return errorResponse("Unit not found in this property", 404);

    if (host_user_id) {
      const host = await prisma.user.findFirst({
        where: { id: host_user_id, property_id, deleted_at: null },
      });
      if (!host) return errorResponse("Host user not found in this property", 404);
    }

    const visit = await prisma.visit.create({
      data: {
        property_id,
        visitor_id,
        unit_id,
        host_user_id: host_user_id || null,
        purpose,
        notes: notes || null,
        vehicle_number: vehicle_number || null,
        expected_checkin_time: expected_checkin_time ? new Date(expected_checkin_time) : null,
        status: "EXPECTED",
      },
      include: {
        visitor: { select: { id: true, name: true, phone: true } },
        unit: { select: { id: true, unit_no: true } },
        host: { select: { id: true, name: true, email: true } },
      },
    });

    await createAuditLog({
      prisma,
      property_id,
      user_id: user.id,
      action: "CREATE_VISIT",
      resource_type: "visit",
      resource_id: visit.id,
      ip_address: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
    });

    return successResponse(visit, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", 400);
    }
    console.error("Create visit error:", error);
    return errorResponse("Internal server error", 500);
  }
}
