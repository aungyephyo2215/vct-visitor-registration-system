import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { requirePropertyAccess, requireRole } from "@/lib/rbac";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(request);
    requireRole(user, "SUPER_ADMIN", "PROPERTY_ADMIN");
    const { id } = await params;

    const entry = await prisma.vehicleBlacklist.findUnique({
      where: { id },
    });

    if (!entry) return notFoundResponse("Blacklist entry not found");

    requirePropertyAccess(user, entry.property_id);

    await prisma.vehicleBlacklist.update({
      where: { id },
      data: { status: "REMOVED" },
    });

    return successResponse({ message: "Vehicle removed from blacklist" });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Remove vehicle blacklist error:", error);
    return errorResponse("Internal server error", 500);
  }
}
