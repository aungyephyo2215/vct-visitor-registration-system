import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { errorResponse, notFoundResponse } from "@/lib/api-response";
import { requirePropertyAccess } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
            expected_date: true,
            expected_time: true,
            unit: { select: { unit_no: true, floor: true } },
            property: { select: { name: true } },
          },
        },
      },
    });

    if (!badge) return notFoundResponse("Badge not found");

    requirePropertyAccess(user, badge.property_id);

    const inv = badge.invitation!;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visitor Badge</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; display: flex; justify-content: center; }
    .badge { width: 350px; border: 2px solid #000; border-radius: 8px; padding: 20px; text-align: center; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .property { font-size: 14px; color: #666; margin-bottom: 12px; }
    .name { font-size: 24px; font-weight: bold; margin: 8px 0; }
    .type { font-size: 14px; color: #333; margin: 4px 0; }
    .unit { font-size: 16px; margin: 8px 0; }
    .date { font-size: 12px; color: #666; margin-top: 12px; }
    .label { font-size: 11px; color: #999; margin-bottom: 2px; }
    @media print { body { padding: 0; } .badge { border: 2px solid #000; } }
  </style>
</head>
<body>
  <div class="badge">
    <h1>VISITOR BADGE</h1>
    <div class="property">${inv.property?.name || "Property"}</div>
    <div class="name">${inv.visitor_name}</div>
    <div class="type">${inv.visitor_type?.replace(/_/g, " ")}</div>
    <div class="unit">Unit ${inv.unit?.unit_no || "—"}${inv.unit?.floor ? ` (Floor ${inv.unit.floor})` : ""}</div>
    <div class="date">${new Date(inv.expected_date).toLocaleDateString()}${inv.expected_time ? ` ${inv.expected_time}` : ""}</div>
    <div class="date">ID: ${badge.id.slice(0, 8)}...</div>
  </div>
  <script>window.print();</script>
</body>
</html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Print badge error:", error);
    return errorResponse("Internal server error", 500);
  }
}
