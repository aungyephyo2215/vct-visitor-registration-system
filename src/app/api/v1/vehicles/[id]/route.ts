import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { vehicleUpdateSchema, formatZodErrors } from "@/lib/validations";
import { requirePropertyAccess, requireRole } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

async function findVehicle(id: string) {
  return prisma.vehicle.findFirst({
    where: { id, deleted_at: null },
    include: {
      ownerUser: { select: { id: true, name: true, email: true } },
      ownerVisitor: { select: { id: true, name: true, phone: true } },
      visits: {
        where: { deleted_at: null },
        orderBy: { created_at: "desc" },
        take: 10,
        select: {
          id: true,
          status: true,
          checkin_time: true,
          checkout_time: true,
          purpose: true,
          unit: { select: { unit_no: true } },
        },
      },
    },
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    requireRole(user, "SUPER_ADMIN", "PROPERTY_ADMIN", "SECURITY_GUARD", "OFFICE_STAFF");
    const { id } = await params;

    const vehicle = await findVehicle(id);
    if (!vehicle) return notFoundResponse("Vehicle not found");

    requirePropertyAccess(user, vehicle.property_id);

    return successResponse(vehicle);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Get vehicle error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    requireRole(user, "SUPER_ADMIN", "PROPERTY_ADMIN", "SECURITY_GUARD");
    const { id } = await params;

    const vehicle = await prisma.vehicle.findFirst({
      where: { id, deleted_at: null },
    });

    if (!vehicle) return notFoundResponse("Vehicle not found");

    requirePropertyAccess(user, vehicle.property_id);

    const body = await request.json();
    const parsed = vehicleUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(formatZodErrors(parsed.error));
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.data.plate_number) {
      // Check for duplicate plate number
      const duplicate = await prisma.vehicle.findFirst({
        where: {
          property_id: vehicle.property_id,
          plate_number: parsed.data.plate_number.toUpperCase(),
          id: { not: id },
          deleted_at: null,
        },
      });
      if (duplicate) {
        return errorResponse("A vehicle with this plate number already exists", 409);
      }
      updateData.plate_number = parsed.data.plate_number.toUpperCase();
    }
    if (parsed.data.vehicle_type) updateData.vehicle_type = parsed.data.vehicle_type;
    if (parsed.data.brand !== undefined) updateData.brand = parsed.data.brand;
    if (parsed.data.color !== undefined) updateData.color = parsed.data.color;
    if (parsed.data.owner_type) updateData.owner_type = parsed.data.owner_type;
    if (parsed.data.owner_user_id !== undefined)
      updateData.owner_user_id = parsed.data.owner_user_id;
    if (parsed.data.owner_visitor_id !== undefined)
      updateData.owner_visitor_id = parsed.data.owner_visitor_id;
    if (parsed.data.status) updateData.status = parsed.data.status;

    const updated = await prisma.vehicle.update({
      where: { id },
      data: updateData,
      include: {
        ownerUser: { select: { id: true, name: true } },
        ownerVisitor: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      prisma,
      property_id: vehicle.property_id,
      user_id: user.id,
      action: "UPDATE_VEHICLE",
      resource_type: "vehicle",
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
    console.error("Update vehicle error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(request);
    requireRole(user, "SUPER_ADMIN", "PROPERTY_ADMIN");
    const { id } = await params;

    const vehicle = await prisma.vehicle.findFirst({
      where: { id, deleted_at: null },
    });

    if (!vehicle) return notFoundResponse("Vehicle not found");

    requirePropertyAccess(user, vehicle.property_id);

    await prisma.vehicle.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    await createAuditLog({
      prisma,
      property_id: vehicle.property_id,
      user_id: user.id,
      action: "DELETE_VEHICLE",
      resource_type: "vehicle",
      resource_id: id,
      ip_address: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
    });

    return successResponse({ message: "Vehicle deleted" });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Delete vehicle error:", error);
    return errorResponse("Internal server error", 500);
  }
}
