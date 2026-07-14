import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, notFoundResponse } from "@/lib/api-response";
import { requirePropertyAccess } from "@/lib/rbac";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const badge = await prisma.badge.findUnique({
      where: { id },
      include: {
        invitation: {
          select: {
            visitor_name: true,
            visitor_phone: true,
            visitor_type: true,
            unit: { select: { unit_no: true, floor: true } },
          },
        },
      },
    });

    if (!badge) return notFoundResponse("Badge not found");

    requirePropertyAccess(user, badge.property_id);

    return successResponse(badge);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Get badge error:", error);
    return errorResponse("Internal server error", 500);
  }
}
