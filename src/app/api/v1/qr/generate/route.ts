import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, validationErrorResponse } from "@/lib/api-response";
import { qrGenerateSchema, formatZodErrors } from "@/lib/validations";
import { requirePropertyAccess, requireRole } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    requireRole(user, "SUPER_ADMIN", "PROPERTY_ADMIN", "SECURITY_GUARD");
    const body = await request.json();
    const parsed = qrGenerateSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(formatZodErrors(parsed.error));
    }

    const { visit_id } = parsed.data;

    const visit = await prisma.visit.findFirst({
      where: { id: visit_id, deleted_at: null },
    });

    if (!visit) return errorResponse("Visit not found", 404);

    requirePropertyAccess(user, visit.property_id);

    const token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const expiresMinutes = parseInt(process.env.QR_EXPIRES_MINUTES || "1440", 10);
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

    const qrCode = await prisma.qRCode.create({
      data: {
        property_id: visit.property_id,
        visit_id: visit.id,
        token_hash: tokenHash,
        status: "ACTIVE",
        expires_at: expiresAt,
      },
    });

    await createAuditLog({
      prisma,
      property_id: visit.property_id,
      user_id: user.id,
      action: "GENERATE_QR",
      resource_type: "qr_code",
      resource_id: qrCode.id,
      ip_address: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
    });

    return successResponse(
      {
        token,
        expires_at: expiresAt,
        qr_code_id: qrCode.id,
      },
      201,
    );
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", 400);
    }
    console.error("Generate QR error:", error);
    return errorResponse("Internal server error", 500);
  }
}
