import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, validationErrorResponse } from "@/lib/api-response";
import { checkoutSchema, formatZodErrors } from "@/lib/validations";
import { requirePropertyAccess, requireRole } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    requireRole(user, "SUPER_ADMIN", "PROPERTY_ADMIN", "SECURITY_GUARD");
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(formatZodErrors(parsed.error));
    }

    const { visit_id } = parsed.data;

    const visit = await prisma.visit.findFirst({
      where: { id: visit_id, deleted_at: null },
    });

    if (!visit) return errorResponse("Visit not found", 404);

    requirePropertyAccess(user, visit.property_id);

    if (visit.status !== "CHECKED_IN") {
      return errorResponse("Visit is not checked in", 400);
    }

    if (visit.checkout_time) {
      return errorResponse("Visit is already checked out", 400);
    }

    const now = new Date();

    const updated = await prisma.visit.update({
      where: { id: visit_id },
      data: { status: "CHECKED_OUT", checkout_time: now },
      include: {
        visitor: { select: { id: true, name: true, phone: true } },
        unit: { select: { id: true, unit_no: true, floor: true } },
      },
    });

    await createAuditLog({
      prisma,
      property_id: visit.property_id,
      user_id: user.id,
      action: "CHECK_OUT",
      resource_type: "visit",
      resource_id: visit_id,
      ip_address: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", 400);
    }
    console.error("Checkout error:", error);
    return errorResponse("Internal server error", 500);
  }
}
