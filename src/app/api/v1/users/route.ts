import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, validationErrorResponse } from "@/lib/api-response";
import { paginationSchema, formatZodErrors } from "@/lib/validations";
import { toSafeUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const query = paginationSchema.safeParse(Object.fromEntries(searchParams));

    if (!query.success) {
      return validationErrorResponse(formatZodErrors(query.error));
    }

    const { page, limit, search } = query.data;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deleted_at: null };

    if (user.property_id) {
      where.property_id = user.property_id;
    }

    const roleParam = searchParams.get("role");
    if (roleParam) {
      where.role = { in: roleParam.split(",") };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          property_id: true,
          unit_id: true,
          created_at: true,
          updated_at: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return successResponse({
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("List users error:", error);
    return errorResponse("Internal server error", 500);
  }
}
