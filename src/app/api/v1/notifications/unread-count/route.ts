import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuth(_request);

    const where: Record<string, unknown> = { is_read: false };
    if (user.role !== "SUPER_ADMIN") {
      where.user_id = user.id;
      where.property_id = user.property_id ?? undefined;
    }

    const count = await prisma.notification.count({ where });

    return successResponse({ count });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Unread count error:", error);
    return errorResponse("Internal server error", 500);
  }
}
