import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, validationErrorResponse } from "@/lib/api-response";
import { vehicleBlacklistCreateSchema, paginationSchema, formatZodErrors } from "@/lib/validations";
import { requirePropertyAccess, requireRole } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    requireRole(user, "SUPER_ADMIN", "PROPERTY_ADMIN", "SECURITY_GUARD");

    const { searchParams } = new URL(request.url);
    const query = paginationSchema.safeParse(Object.fromEntries(searchParams));

    if (!query.success) {
      return validationErrorResponse(formatZodErrors(query.error));
    }

    const { page, limit, search } = query.data;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (user.role !== "SUPER_ADMIN") {
      where.property_id = user.property_id;
    }

    if (search) {
      where.OR = [
        { plate_number: { contains: search, mode: "insensitive" } },
        { reason: { contains: search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.vehicleBlacklist.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          creator: { select: { id: true, name: true } },
        },
      }),
      prisma.vehicleBlacklist.count({ where }),
    ]);

    return successResponse({
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("List vehicle blacklist error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    requireRole(user, "SUPER_ADMIN", "PROPERTY_ADMIN");

    const body = await request.json();
    const parsed = vehicleBlacklistCreateSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(formatZodErrors(parsed.error));
    }

    const property_id =
      user.role === "SUPER_ADMIN" ? body.property_id || user.property_id : user.property_id;

    if (!property_id) {
      return errorResponse("Property ID is required", 400);
    }

    requirePropertyAccess(user, property_id);

    // Check if already blacklisted
    const existing = await prisma.vehicleBlacklist.findFirst({
      where: {
        property_id,
        plate_number: parsed.data.plate_number.toUpperCase(),
      },
    });

    if (existing) {
      if (existing.status === "ACTIVE") {
        return errorResponse("This plate number is already blacklisted", 409);
      }
      // Reactivate if previously removed
      const updated = await prisma.vehicleBlacklist.update({
        where: { id: existing.id },
        data: {
          status: "ACTIVE",
          reason: parsed.data.reason || existing.reason,
          created_by: user.id,
        },
        include: {
          creator: { select: { id: true, name: true } },
        },
      });

      await createAuditLog({
        prisma,
        property_id,
        user_id: user.id,
        action: "BLOCK_VEHICLE",
        resource_type: "vehicle_blacklist",
        resource_id: updated.id,
        ip_address: request.headers.get("x-forwarded-for") || undefined,
        user_agent: request.headers.get("user-agent") || undefined,
        metadata: { plate_number: parsed.data.plate_number.toUpperCase() },
      });

      return successResponse(updated, 201);
    }

    const entry = await prisma.vehicleBlacklist.create({
      data: {
        property_id,
        plate_number: parsed.data.plate_number.toUpperCase(),
        reason: parsed.data.reason || null,
        created_by: user.id,
      },
      include: {
        creator: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      prisma,
      property_id,
      user_id: user.id,
      action: "BLOCK_VEHICLE",
      resource_type: "vehicle_blacklist",
      resource_id: entry.id,
      ip_address: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
      metadata: { plate_number: parsed.data.plate_number.toUpperCase() },
    });

    return successResponse(entry, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", 400);
    }
    console.error("Add vehicle blacklist error:", error);
    return errorResponse("Internal server error", 500);
  }
}
