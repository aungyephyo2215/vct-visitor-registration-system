import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, validationErrorResponse } from "@/lib/api-response";
import { vehicleCreateSchema, paginationSchema, formatZodErrors } from "@/lib/validations";
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

    const { page, limit, search } = query.data;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deleted_at: null };

    if (user.role !== "SUPER_ADMIN") {
      where.property_id = user.property_id;
    }

    if (search) {
      where.OR = [
        { plate_number: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { color: { contains: search, mode: "insensitive" } },
      ];
    }

    const statusParam = searchParams.get("status");
    if (statusParam) {
      where.status = statusParam;
    }

    const typeParam = searchParams.get("type");
    if (typeParam) {
      where.vehicle_type = typeParam;
    }

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          ownerUser: { select: { id: true, name: true } },
          ownerVisitor: { select: { id: true, name: true } },
        },
      }),
      prisma.vehicle.count({ where }),
    ]);

    return successResponse({
      data: vehicles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("List vehicles error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    requireRole(user, "SUPER_ADMIN", "PROPERTY_ADMIN", "SECURITY_GUARD", "RESIDENT");

    const body = await request.json();
    const parsed = vehicleCreateSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(formatZodErrors(parsed.error));
    }

    let property_id: string;

    if (user.role === "SUPER_ADMIN") {
      property_id = parsed.data.property_id || user.property_id || "";
      if (!property_id) {
        return errorResponse("Property ID is required for SUPER_ADMIN", 400);
      }
    } else {
      property_id = user.property_id || "";
    }

    requirePropertyAccess(user, property_id);

    // Check for duplicate plate number in the same property
    const existing = await prisma.vehicle.findFirst({
      where: {
        property_id,
        plate_number: parsed.data.plate_number.toUpperCase(),
        deleted_at: null,
      },
    });

    if (existing) {
      return errorResponse("A vehicle with this plate number already exists", 409);
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        property_id,
        plate_number: parsed.data.plate_number.toUpperCase(),
        vehicle_type: parsed.data.vehicle_type,
        brand: parsed.data.brand || null,
        color: parsed.data.color || null,
        owner_type: parsed.data.owner_type,
        owner_user_id: parsed.data.owner_user_id || null,
        owner_visitor_id: parsed.data.owner_visitor_id || null,
      },
      include: {
        ownerUser: { select: { id: true, name: true } },
        ownerVisitor: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      prisma,
      property_id,
      user_id: user.id,
      action: "CREATE_VEHICLE",
      resource_type: "vehicle",
      resource_id: vehicle.id,
      ip_address: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
    });

    return successResponse(vehicle, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", 400);
    }
    console.error("Create vehicle error:", error);
    return errorResponse("Internal server error", 500);
  }
}
