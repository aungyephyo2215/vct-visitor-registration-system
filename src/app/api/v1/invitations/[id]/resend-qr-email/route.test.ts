import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockInvitationFindFirst,
  mockQRCodeFindFirst,
  mockQrEmailDeliveryFindFirst,
  mockRequireAuth,
  mockRequireRole,
  mockRequirePropertyAccess,
  mockCreateAuditLog,
  mockSendInvitationQrEmail,
  consoleErrorSpy,
} = vi.hoisted(() => ({
  mockInvitationFindFirst: vi.fn(),
  mockQRCodeFindFirst: vi.fn(),
  mockQrEmailDeliveryFindFirst: vi.fn(),
  mockRequireAuth: vi.fn(),
  mockRequireRole: vi.fn(),
  mockRequirePropertyAccess: vi.fn(),
  mockCreateAuditLog: vi.fn(),
  mockSendInvitationQrEmail: vi.fn(),
  consoleErrorSpy: vi.spyOn(console, "error").mockImplementation(() => {}),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    invitation: {
      findFirst: mockInvitationFindFirst,
    },
    qRCode: {
      findFirst: mockQRCodeFindFirst,
    },
    qrEmailDelivery: {
      findFirst: mockQrEmailDeliveryFindFirst,
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

vi.mock("@/lib/email/qr-delivery", () => ({
  sendInvitationQrEmail: mockSendInvitationQrEmail,
}));

import { POST } from "./route";

const invitation = {
  id: "inv-1",
  property_id: "prop-1",
  invited_by: "user-1",
  visitor_name: "Aung Kyaw",
  status: "APPROVED",
  visit_id: "visit-1",
};

const qrCode = {
  id: "qr-1",
  property_id: "prop-1",
  visit_id: "visit-1",
  status: "ACTIVE",
  expires_at: new Date("2026-06-23T10:30:00.000Z"),
  revoked_at: null,
  used_at: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-22T10:00:00.000Z"));
  process.env.QR_EMAIL_RESEND_COOLDOWN_SECONDS = "300";

  mockRequireAuth.mockResolvedValue({
    id: "staff-1",
    role: "PROPERTY_ADMIN",
    property_id: "prop-1",
  });
  mockInvitationFindFirst.mockResolvedValue(invitation);
  mockRequirePropertyAccess.mockReturnValue(undefined);
  mockQRCodeFindFirst.mockResolvedValue(qrCode);
  mockQrEmailDeliveryFindFirst.mockResolvedValue(null);
  mockCreateAuditLog.mockResolvedValue(undefined);
  mockSendInvitationQrEmail.mockResolvedValue({
    status: "SENT",
    provider: "mock",
    deliveryId: "delivery-1",
    attempted: true,
    recipientEmail: "visitor@example.com",
    triggerType: "MANUAL_RESEND",
    providerMessageId: "provider-message-1",
    failureCode: null,
    failureMessage: null,
    sentAt: new Date("2026-06-22T10:00:30.000Z"),
  });
  consoleErrorSpy.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /api/v1/invitations/[id]/resend-qr-email", () => {
  it("resends QR email with MANUAL_RESEND trigger, same QR-capable RBAC roles, and safe response", async () => {
    mockQrEmailDeliveryFindFirst.mockResolvedValue({
      id: "delivery-old",
      created_at: new Date("2026-06-22T09:50:00.000Z"),
    });

    const response = await POST(
      new NextRequest("https://app.example.com/api/v1/invitations/inv-1/resend-qr-email", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "inv-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockRequireRole).toHaveBeenCalledWith(
      { id: "staff-1", role: "PROPERTY_ADMIN", property_id: "prop-1" },
      "SUPER_ADMIN",
      "PROPERTY_ADMIN",
      "OFFICE_STAFF",
      "SECURITY_GUARD",
    );
    expect(mockRequirePropertyAccess).toHaveBeenCalledWith(
      { id: "staff-1", role: "PROPERTY_ADMIN", property_id: "prop-1" },
      "prop-1",
    );
    expect(mockSendInvitationQrEmail).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        invitationId: "inv-1",
        qrCodeId: "qr-1",
        triggerType: "MANUAL_RESEND",
        createdBy: "staff-1",
      }),
    );

    const body = await response.json();
    expect(body).toEqual({
      success: true,
      data: {
        emailDelivery: {
          status: "SENT",
          provider: "mock",
          deliveryId: "delivery-1",
        },
      },
    });
    expect(JSON.stringify(body)).not.toContain("visitor@example.com");
    expect(JSON.stringify(body)).not.toContain("provider-message-1");
  });

  it("enforces resend cooldown and returns 429 with Retry-After without sending", async () => {
    mockQrEmailDeliveryFindFirst.mockResolvedValue({
      id: "delivery-recent",
      created_at: new Date("2026-06-22T09:57:00.000Z"),
    });

    const response = await POST(
      new NextRequest("https://app.example.com/api/v1/invitations/inv-1/resend-qr-email", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "inv-1" }) },
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("120");
    expect(mockSendInvitationQrEmail).not.toHaveBeenCalled();
    expect(mockCreateAuditLog).not.toHaveBeenCalled();

    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: {
        message: "QR email resend is on cooldown",
        details: {
          retryAfterSeconds: 120,
          cooldownSeconds: 300,
        },
      },
    });
  });

  it("returns 400 when invitation has no active QR code to resend", async () => {
    mockQRCodeFindFirst.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("https://app.example.com/api/v1/invitations/inv-1/resend-qr-email", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "inv-1" }) },
    );

    expect(response.status).toBe(400);
    expect(mockSendInvitationQrEmail).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      success: false,
      error: { message: "No active QR code available for resend" },
    });
  });
});
