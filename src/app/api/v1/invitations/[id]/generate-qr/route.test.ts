import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockInvitationFindFirst,
  mockVisitCreate,
  mockQRCodeCreate,
  mockInvitationUpdate,
  mockRequireAuth,
  mockRequireRole,
  mockRequirePropertyAccess,
  mockCreateAuditLog,
  mockSendNotification,
  mockSendInvitationQrEmail,
  mockRandomBytes,
  mockCreateHashUpdate,
  mockCreateHashDigest,
  consoleErrorSpy,
} = vi.hoisted(() => ({
  mockInvitationFindFirst: vi.fn(),
  mockVisitCreate: vi.fn(),
  mockQRCodeCreate: vi.fn(),
  mockInvitationUpdate: vi.fn(),
  mockRequireAuth: vi.fn(),
  mockRequireRole: vi.fn(),
  mockRequirePropertyAccess: vi.fn(),
  mockCreateAuditLog: vi.fn(),
  mockSendNotification: vi.fn(),
  mockSendInvitationQrEmail: vi.fn(),
  mockRandomBytes: vi.fn(),
  mockCreateHashUpdate: vi.fn(),
  mockCreateHashDigest: vi.fn(),
  consoleErrorSpy: vi.spyOn(console, "error").mockImplementation(() => {}),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    invitation: {
      findFirst: mockInvitationFindFirst,
      update: mockInvitationUpdate,
    },
    visit: {
      create: mockVisitCreate,
    },
    qRCode: {
      create: mockQRCodeCreate,
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock("@/lib/rbac", () => ({
  requireRole: mockRequireRole,
  requirePropertyAccess: mockRequirePropertyAccess,
}));

vi.mock("@/lib/audit", () => ({
  createAuditLog: mockCreateAuditLog,
}));

vi.mock("@/lib/notifications/service", () => ({
  sendNotification: mockSendNotification,
}));

vi.mock("@/lib/email/qr-delivery", () => ({
  sendInvitationQrEmail: mockSendInvitationQrEmail,
}));

vi.mock("crypto", () => ({
  default: {
    randomBytes: mockRandomBytes,
    createHash: vi.fn(() => ({
      update: mockCreateHashUpdate,
      digest: mockCreateHashDigest,
    })),
  },
}));

import { POST } from "./route";

const invitation = {
  id: "inv-1",
  property_id: "prop-1",
  unit_id: "unit-1",
  invited_by: "user-1",
  visitor_name: "Aung Kyaw",
  visitor_type: "GUEST",
  notes: "Please show ID",
  expected_date: new Date("2026-06-22T10:30:00.000Z"),
  status: "APPROVED",
  visit_id: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy.mockClear();
  process.env.QR_EXPIRES_MINUTES = "1440";

  mockRequireAuth.mockResolvedValue({ id: "staff-1", role: "PROPERTY_ADMIN" });
  mockInvitationFindFirst.mockResolvedValue(invitation);
  mockVisitCreate.mockResolvedValue({ id: "visit-1" });
  mockQRCodeCreate.mockResolvedValue({ id: "qr-1" });
  mockInvitationUpdate.mockResolvedValue({ id: "inv-1", visit_id: "visit-1" });
  mockCreateAuditLog.mockResolvedValue(undefined);
  mockSendNotification.mockResolvedValue(undefined);
  mockSendInvitationQrEmail.mockResolvedValue({
    status: "SENT",
    provider: "mock",
    deliveryId: "delivery-1",
    attempted: true,
    recipientEmail: "visitor@example.com",
    triggerType: "AUTO",
    providerMessageId: "provider-message-1",
    failureCode: null,
    failureMessage: null,
    sentAt: new Date("2026-06-22T10:31:00.000Z"),
  });
  mockRandomBytes.mockReturnValue({
    toString: vi.fn().mockReturnValue("raw-token-123"),
  });
  mockCreateHashUpdate.mockReturnThis();
  mockCreateHashDigest.mockReturnValue("hashed-token-123");
});

describe("POST /api/v1/invitations/[id]/generate-qr", () => {
  it("generates a QR code, triggers QR email delivery, and returns only a safe emailDelivery summary", async () => {
    const response = await POST(
      new NextRequest("https://app.example.com/api/v1/invitations/inv-1/generate-qr", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "inv-1" }) },
    );

    expect(response.status).toBe(201);
    const body = await response.json();

    expect(mockSendInvitationQrEmail).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        invitationId: "inv-1",
        qrCodeId: "qr-1",
        rawToken: "raw-token-123",
        triggerType: "AUTO",
        createdBy: "staff-1",
      }),
    );

    expect(body).toEqual({
      success: true,
      data: {
        expires_at: expect.any(String),
        visit_id: "visit-1",
        qr_code_id: "qr-1",
        emailDelivery: {
          status: "SENT",
          provider: "mock",
          deliveryId: "delivery-1",
        },
      },
    });

    expect(body.data).not.toHaveProperty("token");
    expect(JSON.stringify(body)).not.toContain("raw-token-123");
    expect(JSON.stringify(body)).not.toContain("provider-message-1");
    expect(JSON.stringify(body)).not.toContain("visitor@example.com");
  });

  it("still succeeds when QR email delivery throws and logs only a sanitized message", async () => {
    mockSendInvitationQrEmail.mockRejectedValue(
      new Error("QR email failed for raw-token-123 due to provider timeout"),
    );

    const response = await POST(
      new NextRequest("https://app.example.com/api/v1/invitations/inv-1/generate-qr", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "inv-1" }) },
    );

    expect(response.status).toBe(201);
    const body = await response.json();

    expect(body).toEqual({
      success: true,
      data: {
        expires_at: expect.any(String),
        visit_id: "visit-1",
        qr_code_id: "qr-1",
        emailDelivery: {
          status: "FAILED",
          provider: "unknown",
          deliveryId: null,
          failureCode: "QR_EMAIL_DELIVERY_FAILED",
        },
      },
    });

    expect(body.data).not.toHaveProperty("token");
    expect(JSON.stringify(body)).not.toContain("raw-token-123");

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "QR email delivery failed after QR generation:",
      "QR email failed for [REDACTED] due to provider timeout",
    );
    expect(consoleErrorSpy.mock.calls[0][1]).not.toContain("raw-token-123");
    expect(consoleErrorSpy.mock.calls[0][1]).not.toBeInstanceOf(Error);
  });
});
