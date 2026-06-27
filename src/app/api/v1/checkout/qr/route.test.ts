import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRequireAuth,
  mockRequireRole,
  mockRequirePropertyAccess,
  mockCreateAuditLog,
  mockSendNotification,
  mockResolveQrToken,
  prisma,
} = vi.hoisted(() => {
  const prisma = {
    visit: {
      update: vi.fn(),
    },
  };

  return {
    mockRequireAuth: vi.fn(),
    mockRequireRole: vi.fn(),
    mockRequirePropertyAccess: vi.fn(),
    mockCreateAuditLog: vi.fn(),
    mockSendNotification: vi.fn(),
    mockResolveQrToken: vi.fn(),
    prisma,
  };
});

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/auth", () => ({ requireAuth: mockRequireAuth }));
vi.mock("@/lib/rbac", () => ({
  requireRole: mockRequireRole,
  requirePropertyAccess: mockRequirePropertyAccess,
}));
vi.mock("@/lib/audit", () => ({ createAuditLog: mockCreateAuditLog }));
vi.mock("@/lib/notifications/service", () => ({ sendNotification: mockSendNotification }));
vi.mock("@/lib/qr-token-resolver", () => ({ resolveQrToken: mockResolveQrToken }));

import { POST } from "./route";

describe("POST /api/v1/checkout/qr", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      id: "guard-1",
      property_id: "prop-1",
      role: "SECURITY_GUARD",
    });
  });

  it("checks out a checked-in visitor successfully when visit has no vehicle relation", async () => {
    mockResolveQrToken.mockResolvedValue({
      id: "qr-1",
      property_id: "prop-1",
      status: "USED",
      visit: {
        id: "visit-1",
        property_id: "prop-1",
        host_user_id: "host-1",
        vehicle_id: null,
        status: "CHECKED_IN",
        checkout_time: null,
      },
    });
    prisma.visit.update.mockResolvedValue({
      id: "visit-1",
      status: "CHECKED_OUT",
      visitor: { id: "visitor-1", name: "QA Checked In Visitor", phone: "+959****0103" },
      unit: { id: "unit-1", unit_no: "12A", floor: 12 },
      verification: { id: "verification-1", nda_signed: true, safety_form_signed: true },
      checkout_time: new Date("2026-06-27T09:00:00.000Z"),
    });

    const response = await POST(
      new NextRequest("https://app.example.com/api/v1/checkout/qr", {
        method: "POST",
        body: JSON.stringify({ token: "QA_CHECKEDIN_VISITOR_TOKEN" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: expect.objectContaining({
        id: "visit-1",
        status: "CHECKED_OUT",
      }),
    });
    expect(prisma.visit.update).toHaveBeenCalledWith({
      where: { id: "visit-1" },
      data: { status: "CHECKED_OUT", checkout_time: expect.any(Date) },
      include: {
        visitor: { select: { id: true, name: true, phone: true } },
        unit: { select: { id: true, unit_no: true, floor: true } },
        verification: {
          select: { id: true, nda_signed: true, safety_form_signed: true },
        },
      },
    });
    expect(mockCreateAuditLog).toHaveBeenCalledOnce();
    expect(mockSendNotification).toHaveBeenCalledOnce();
  });
});
