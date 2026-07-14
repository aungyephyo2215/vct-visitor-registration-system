import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { visitorUpdateSchema, formatZodErrors } from "@/lib/validations";
import { requirePropertyAccess, requireRole } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

async function findVisitor(id: string) {
  return prisma.visitor.findFirst({
    where: { id, deleted_at: null },
    include: { property: { select: { id: true, name: true } } },
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    requireRole(user, "SUPER_ADMIN", "PROPERTY_ADMIN", "SECURITY_GUARD", "OFFICE_STAFF");
    const { id } = await params;
    const visitor = await findVisitor(id);

    if (!visitor) return notFoundResponse("Visitor not found");

    requirePropertyAccess(user, visitor.property_id);

    return successResponse(visitor);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Get visitor error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    requireRole(user, "SUPER_ADMIN", "PROPERTY_ADMIN", "SECURITY_GUARD", "OFFICE_STAFF");
    const { id } = await params;
    const visitor = await findVisitor(id);

    if (!visitor) return notFoundResponse("Visitor not found");

    requirePropertyAccess(user, visitor.property_id);

    const body = await request.json();
    const parsed = visitorUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(formatZodErrors(parsed.error));
    }

    const updated = await prisma.visitor.update({
      where: { id },
      data: parsed.data,
    });

    await createAuditLog({
      prisma,
      property_id: visitor.property_id,
      user_id: user.id,
      action: "UPDATE_VISITOR",
      resource_type: "visitor",
      resource_id: id,
      ip_address: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", 400);
    }
    console.error("Update visitor error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(request);
    requireRole(user, "SUPER_ADMIN", "PROPERTY_ADMIN", "SECURITY_GUARD", "OFFICE_STAFF");
    const { id } = await params;
    const visitor = await findVisitor(id);

    if (!visitor) return notFoundResponse("Visitor not found");

    requirePropertyAccess(user, visitor.property_id);

    await prisma.visitor.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    await createAuditLog({
      prisma,
      property_id: visitor.property_id,
      user_id: user.id,
      action: "DELETE_VISITOR",
      resource_type: "visitor",
      resource_id: id,
      ip_address: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
    });

    return successResponse({ message: "Visitor deleted" });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Delete visitor error:", error);
    return errorResponse("Internal server error", 500);
  }
}
