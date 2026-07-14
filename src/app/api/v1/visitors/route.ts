import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  forbiddenResponse,
} from "@/lib/api-response";
import { visitorCreateSchema, paginationSchema, formatZodErrors } from "@/lib/validations";
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
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { id_number: { contains: search, mode: "insensitive" } },
      ];
    }

    const [visitors, total] = await Promise.all([
      prisma.visitor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: { property: { select: { id: true, name: true } } },
      }),
      prisma.visitor.count({ where }),
    ]);

    return successResponse({
      data: visitors,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("List visitors error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    requireRole(user, "SUPER_ADMIN", "PROPERTY_ADMIN", "SECURITY_GUARD", "OFFICE_STAFF");
    const body = await request.json();
    const parsed = visitorCreateSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(formatZodErrors(parsed.error));
    }

    let property_id: string | undefined = parsed.data.property_id;

    if (user.role === "SUPER_ADMIN") {
      if (!property_id) {
        return errorResponse("property_id is required for SUPER_ADMIN", 400);
      }
    } else {
      property_id = user.property_id ?? undefined;
    }

    if (!property_id) {
      return errorResponse("No property associated", 400);
    }

    requirePropertyAccess(user, property_id!);

    const property = await prisma.property.findUnique({
      where: { id: property_id },
    });

    if (!property || property.deleted_at) {
      return errorResponse("Property not found", 404);
    }

    const visitor = await prisma.visitor.create({
      data: {
        property_id,
        name: parsed.data.name,
        phone: parsed.data.phone,
        id_type: parsed.data.id_type,
        id_number: parsed.data.id_number,
        photo_url: parsed.data.photo_url || null,
      },
    });

    await createAuditLog({
      prisma,
      property_id,
      user_id: user.id,
      action: "CREATE_VISITOR",
      resource_type: "visitor",
      resource_id: visitor.id,
      ip_address: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
    });

    return successResponse(visitor, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", 400);
    }
    console.error("Create visitor error:", error);
    return errorResponse("Internal server error", 500);
  }
}
