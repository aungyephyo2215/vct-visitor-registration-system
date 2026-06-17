import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) return notFoundResponse("Notification not found");

    // Only owner or SUPER_ADMIN can mark as read
    if (user.role !== "SUPER_ADMIN" && notification.user_id !== user.id) {
      return errorResponse("Not authorized", 403);
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { is_read: true, read_at: new Date() },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Mark read error:", error);
    return errorResponse("Internal server error", 500);
  }
}
