import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRequireAuth,
  mockRequireRole,
  mockRequirePropertyAccess,
  mockCreateAuditLog,
  mockSendNotification,
  prisma,
} = vi.hoisted(() => {
  const prisma = {
    visit: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    verification: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    visitor: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops)),
  };

  return {
    mockRequireAuth: vi.fn(),
    mockRequireRole: vi.fn(),
    mockRequirePropertyAccess: vi.fn(),
    mockCreateAuditLog: vi.fn(),
    mockSendNotification: vi.fn(),
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

import { POST } from "./route";

describe("POST /api/v1/visits/[id]/verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      id: "guard-1",
      property_id: "prop-1",
      role: "SECURITY_GUARD",
    });
  });

  it("creates verification successfully when visit has no vehicle relation", async () => {
    prisma.visit.findFirst.mockResolvedValue({
      id: "visit-1",
      property_id: "prop-1",
      status: "EXPECTED",
      host_user_id: "host-1",
      vehicle_id: null,
      deleted_at: null,
    });
    prisma.verification.findUnique.mockResolvedValue(null);
    prisma.visitor.findFirst.mockResolvedValue({
      id: "visitor-1",
      property_id: "prop-1",
      name: "Existing Visitor",
      phone: "+95900000101",
      id_type: "PASSPORT",
      id_number: "ID-1",
      photo_url: null,
    });
    prisma.visitor.update.mockResolvedValue({
      id: "visitor-1",
      property_id: "prop-1",
      name: "QA Expected Visitor",
      phone: "+95900000101",
      id_type: "PASSPORT",
      id_number: "ID-1",
      photo_url: null,
    });
    prisma.verification.create.mockResolvedValue({
      id: "verification-1",
      visit_id: "visit-1",
      visitor_id: "visitor-1",
      nda_signed: true,
      safety_form_signed: true,
      visitor: {
        id: "visitor-1",
        name: "QA Expected Visitor",
      },
      verifier: {
        id: "guard-1",
        name: "Guard",
      },
    });
    prisma.visit.update.mockResolvedValue({ id: "visit-1", visitor_id: "visitor-1" });

    const response = await POST(
      new NextRequest("https://app.example.com/api/v1/visits/visit-1/verification", {
        method: "POST",
        body: JSON.stringify({
          visitor_name: "QA Expected Visitor",
          visitor_phone: "+95900000101",
          visitor_id_type: "PASSPORT",
          visitor_id_number: "ID-1",
          nda_signed: true,
          safety_form_signed: true,
        }),
      }),
      { params: Promise.resolve({ id: "visit-1" }) },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: expect.objectContaining({
        id: "verification-1",
        visit_id: "visit-1",
        visitor_id: "visitor-1",
      }),
    });
    expect(prisma.visit.findFirst).toHaveBeenCalledWith({
      where: { id: "visit-1", deleted_at: null },
    });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(mockCreateAuditLog).toHaveBeenCalledOnce();
    expect(mockSendNotification).toHaveBeenCalledOnce();
  });
});
