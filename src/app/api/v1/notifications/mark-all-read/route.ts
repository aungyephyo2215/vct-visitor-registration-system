import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const result = await prisma.notification.updateMany({
      where: { user_id: user.id, is_read: false },
      data: { is_read: true, read_at: new Date() },
    });

    return successResponse({ count: result.count });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Mark all read error:", error);
    return errorResponse("Internal server error", 500);
  }
}
