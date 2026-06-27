import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRequireAuth,
  mockRequireRole,
  mockCreateAuditLog,
  mockSendNotification,
  mockResolveQrToken,
  prisma,
} = vi.hoisted(() => {
  const prisma = {
    blocklist: {
      findFirst: vi.fn(),
    },
    visit: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    qRCode: {
      update: vi.fn(),
    },
    $transaction: vi.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops)),
  };

  return {
    mockRequireAuth: vi.fn(),
    mockRequireRole: vi.fn(),
    mockCreateAuditLog: vi.fn(),
    mockSendNotification: vi.fn(),
    mockResolveQrToken: vi.fn(),
    prisma,
  };
});

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/auth", () => ({ requireAuth: mockRequireAuth }));
vi.mock("@/lib/rbac", () => ({ requireRole: mockRequireRole }));
vi.mock("@/lib/audit", () => ({ createAuditLog: mockCreateAuditLog }));
vi.mock("@/lib/notifications/service", () => ({ sendNotification: mockSendNotification }));
vi.mock("@/lib/qr-token-resolver", () => ({ resolveQrToken: mockResolveQrToken }));

import { POST } from "./route";

describe("POST /api/v1/checkin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      id: "guard-1",
      property_id: "prop-1",
      role: "SECURITY_GUARD",
    });
    prisma.blocklist.findFirst.mockResolvedValue(null);
  });

  it("checks in a verified visitor successfully when visit has no vehicle relation", async () => {
    const nowVisit = {
      id: "visit-1",
      property_id: "prop-1",
      visitor_id: "visitor-1",
      host_user_id: "host-1",
      unit_id: "unit-1",
      vehicle_id: null,
      status: "EXPECTED",
      visitor: {
        id: "visitor-1",
        name: "QA Verified Visitor",
        phone: "+959****0102",
        id_number: "ID-2",
      },
      verification: {
        id: "verification-1",
        nda_signed: true,
        safety_form_signed: true,
      },
    };

    mockResolveQrToken.mockResolvedValue({
      id: "qr-1",
      property_id: "prop-1",
      status: "ACTIVE",
      expires_at: new Date("2099-01-01T00:00:00.000Z"),
      visit: nowVisit,
    });
    prisma.visit.update.mockResolvedValue({ id: "visit-1", status: "CHECKED_IN" });
    prisma.qRCode.update.mockResolvedValue({ id: "qr-1", status: "USED" });
    prisma.visit.findUnique.mockResolvedValue({
      ...nowVisit,
      status: "CHECKED_IN",
      checkin_time: new Date("2026-06-27T08:00:00.000Z"),
      unit: { id: "unit-1", unit_no: "12A", floor: 12 },
    });

    const response = await POST(
      new NextRequest("https://app.example.com/api/v1/checkin", {
        method: "POST",
        body: JSON.stringify({ token: "QA_VERIFIED_VISITOR_TOKEN" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: expect.objectContaining({
        id: "visit-1",
        status: "CHECKED_IN",
      }),
    });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(prisma.visit.findUnique).toHaveBeenCalledWith({
      where: { id: "visit-1" },
      include: {
        visitor: { select: { id: true, name: true, phone: true } },
        unit: { select: { id: true, unit_no: true, floor: true } },
      },
    });
    expect(mockCreateAuditLog).toHaveBeenCalledOnce();
    expect(mockSendNotification).toHaveBeenCalledOnce();
  });
});
