import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, validationErrorResponse } from "@/lib/api-response";
import { paginationSchema, formatZodErrors } from "@/lib/validations";

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
    const isReadFilter = searchParams.get("is_read");

    const where: Record<string, unknown> = {};
    if (user.role !== "SUPER_ADMIN") {
      where.user_id = user.id;
      where.property_id = user.property_id ?? undefined;
    }
    if (isReadFilter === "false") {
      where.is_read = false;
    } else if (isReadFilter === "true") {
      where.is_read = true;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [{ is_read: "asc" }, { created_at: "desc" }],
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return successResponse({
      data: notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("List notifications error:", error);
    return errorResponse("Internal server error", 500);
  }
}
