import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { requirePropertyAccess, requireRole } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { sendNotification } from "@/lib/notifications/service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    requireRole(user, "SUPER_ADMIN", "PROPERTY_ADMIN", "OFFICE_STAFF", "SECURITY_GUARD");
    const { id } = await params;

    const visit = await prisma.visit.findFirst({
      where: { id, deleted_at: null },
    });

    if (!visit) return notFoundResponse("Visit not found");
    requirePropertyAccess(user, visit.property_id);

    const verification = await prisma.verification.findUnique({
      where: { visit_id: id },
      include: { visitor: true },
    });

    return successResponse(verification || null);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Get verification error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    requireRole(user, "SUPER_ADMIN", "PROPERTY_ADMIN", "OFFICE_STAFF", "SECURITY_GUARD");
    const { id } = await params;

    const visit = await prisma.visit.findFirst({
      where: { id, deleted_at: null },
    });

    if (!visit) return notFoundResponse("Visit not found");
    requirePropertyAccess(user, visit.property_id);

    // Verify not already verified
    const existing = await prisma.verification.findUnique({
      where: { visit_id: id },
    });
    if (existing) {
      return errorResponse("Visit already verified. Use PATCH to update.", 400);
    }

    const body = await request.json();

    if (!body.visitor_name || !body.visitor_phone) {
      return errorResponse("Visitor name and phone are required", 400);
    }

    // Find or create visitor
    let visitor = await prisma.visitor.findFirst({
      where: { property_id: visit.property_id, phone: body.visitor_phone, deleted_at: null },
    });

    if (visitor) {
      visitor = await prisma.visitor.update({
        where: { id: visitor.id },
        data: {
          name: body.visitor_name,
          id_number: body.visitor_id_number || visitor.id_number,
          id_type: body.visitor_id_type || visitor.id_type,
          photo_url: body.photo_url !== undefined ? body.photo_url : visitor.photo_url,
        },
      });
    } else {
      visitor = await prisma.visitor.create({
        data: {
          property_id: visit.property_id,
          name: body.visitor_name,
          phone: body.visitor_phone,
          id_type: body.visitor_id_type || "OTHER",
          id_number: body.visitor_id_number || "TBD",
          photo_url: body.photo_url || null,
        },
      });
    }

    // Create verification + attach visitor to visit in transaction
    const [verification] = await prisma.$transaction([
      prisma.verification.create({
        data: {
          property_id: visit.property_id,
          visit_id: id,
          visitor_id: visitor.id,
          photo_url: body.photo_url || null,
          vehicle_number: body.vehicle_number || null,
          nda_signed: body.nda_signed === true,
          safety_form_signed: body.safety_form_signed === true,
          verified_by: user.id,
        },
        include: { visitor: true, verifier: { select: { id: true, name: true } } },
      }),
      prisma.visit.update({
        where: { id },
        data: { visitor_id: visitor.id },
      }),
    ]);

    await createAuditLog({
      prisma,
      property_id: visit.property_id,
      user_id: user.id,
      action: "VERIFY_VISITOR",
      resource_type: "visit",
      resource_id: id,
      ip_address: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
      metadata: {
        visitor_id: visitor.id,
        nda_signed: body.nda_signed,
        safety_signed: body.safety_form_signed,
      },
    });

    // Notify host
    await sendNotification(
      prisma,
      "VISITOR_VERIFIED",
      {
        kind: "visit",
        hostUserId: visit.host_user_id,
      },
      { visitor: body.visitor_name },
      visit.property_id,
      id,
    );

    return successResponse(verification, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", 400);
    }
    console.error("Create verification error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    requireRole(user, "SUPER_ADMIN", "PROPERTY_ADMIN", "OFFICE_STAFF", "SECURITY_GUARD");
    const { id } = await params;

    const visit = await prisma.visit.findFirst({
      where: { id, deleted_at: null },
    });

    if (!visit) return notFoundResponse("Visit not found");
    requirePropertyAccess(user, visit.property_id);

    const existing = await prisma.verification.findUnique({
      where: { visit_id: id },
    });
    if (!existing) {
      return errorResponse("No verification found. Use POST to create.", 400);
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.photo_url !== undefined) updateData.photo_url = body.photo_url;
    if (body.vehicle_number !== undefined) updateData.vehicle_number = body.vehicle_number;
    if (body.nda_signed !== undefined) updateData.nda_signed = body.nda_signed;
    if (body.safety_form_signed !== undefined)
      updateData.safety_form_signed = body.safety_form_signed;

    const verification = await prisma.verification.update({
      where: { id: existing.id },
      data: updateData,
      include: { visitor: true, verifier: { select: { id: true, name: true } } },
    });

    return successResponse(verification);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", 400);
    }
    console.error("Update verification error:", error);
    return errorResponse("Internal server error", 500);
  }
}
