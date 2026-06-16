import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, validationErrorResponse } from "@/lib/api-response";
import { paginationSchema, formatZodErrors } from "@/lib/validations";
import { requirePropertyAccess } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const query = paginationSchema.safeParse(Object.fromEntries(searchParams));

    if (!query.success) {
      return validationErrorResponse(formatZodErrors(query.error));
    }

    const { page, limit } = query.data;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deleted_at: null };

    if (user.property_id) {
      where.property_id = user.property_id;
    }

    const [units, total] = await Promise.all([
      prisma.unit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { unit_no: "asc" },
      }),
      prisma.unit.count({ where }),
    ]);

    return successResponse({
      data: units,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("List units error:", error);
    return errorResponse("Internal server error", 500);
  }
}
