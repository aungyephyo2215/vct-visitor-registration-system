import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockInvitationFindFirst,
  mockQRCodeFindFirst,
  mockQrEmailDeliveryFindFirst,
  mockRequireAuth,
  mockRequirePropertyAccess,
  consoleErrorSpy,
} = vi.hoisted(() => ({
  mockInvitationFindFirst: vi.fn(),
  mockQRCodeFindFirst: vi.fn(),
  mockQrEmailDeliveryFindFirst: vi.fn(),
  mockRequireAuth: vi.fn(),
  mockRequirePropertyAccess: vi.fn(),
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
    unit: {
      findFirst: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock("@/lib/rbac", () => ({
  requirePropertyAccess: mockRequirePropertyAccess,
  requireRole: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  createAuditLog: vi.fn(),
}));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy.mockClear();

  mockRequireAuth.mockResolvedValue({
    id: "staff-1",
    role: "PROPERTY_ADMIN",
    property_id: "prop-1",
  });

  mockInvitationFindFirst.mockResolvedValue({
    id: "inv-1",
    property_id: "prop-1",
    invited_by: "resident-1",
    visitor_name: "Aung Kyaw",
    visitor_phone: "+959123456789",
    visitor_email: "visitor@example.com",
    visitor_id_type: null,
    visitor_id_number: null,
    visitor_type: "GUEST",
    expected_date: new Date("2026-06-22T00:00:00.000Z"),
    expected_time: "10:30",
    notes: "Please call on arrival",
    status: "APPROVED",
    reason: null,
    visit_id: "visit-1",
    created_at: new Date("2026-06-20T00:00:00.000Z"),
    inviter: { id: "resident-1", name: "Daw Mya", email: "host@example.com" },
    approver: { id: "staff-1", name: "Front Desk" },
    unit: { id: "unit-1", unit_no: "12B", floor: 12 },
  });
});

describe("GET /api/v1/invitations/[id]", () => {
  it("returns safe QR email delivery status and active QR metadata without exposing sensitive tokens", async () => {
    mockQRCodeFindFirst.mockResolvedValue({
      id: "qr-1",
      expires_at: new Date("2026-06-23T10:30:00.000Z"),
    });
    mockQrEmailDeliveryFindFirst.mockResolvedValue({
      id: "delivery-1",
      status: "FAILED",
      provider: "smtp",
      trigger_type: "MANUAL_RESEND",
      failure_code: "PROVIDER_TIMEOUT",
      sent_at: null,
      created_at: new Date("2026-06-22T10:00:00.000Z"),
      provider_message_id: "provider-secret",
      email_access_token: "opaque-email-token",
    });

    const response = await GET(
      new NextRequest("https://app.example.com/api/v1/invitations/inv-1"),
      { params: Promise.resolve({ id: "inv-1" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body).toEqual({
      success: true,
      data: expect.objectContaining({
        id: "inv-1",
        visit_id: "visit-1",
        qrCode: {
          hasActive: true,
          expiresAt: expect.any(String),
        },
        qrEmailDelivery: {
          deliveryId: "delivery-1",
          status: "FAILED",
          provider: "smtp",
          triggerType: "MANUAL_RESEND",
          failureCode: "PROVIDER_TIMEOUT",
          sentAt: null,
          createdAt: expect.any(String),
        },
      }),
    });

    expect(body.data.qrEmailDelivery).not.toHaveProperty("provider_message_id");
    expect(body.data.qrEmailDelivery).not.toHaveProperty("providerMessageId");
    expect(body.data.qrEmailDelivery).not.toHaveProperty("email_access_token");
    expect(JSON.stringify(body)).not.toContain("provider-secret");
    expect(JSON.stringify(body)).not.toContain("opaque-email-token");
  });

  it("returns null safe QR fields when no active QR or delivery exists", async () => {
    mockQRCodeFindFirst.mockResolvedValue(null);
    mockQrEmailDeliveryFindFirst.mockResolvedValue(null);

    const response = await GET(
      new NextRequest("https://app.example.com/api/v1/invitations/inv-1"),
      { params: Promise.resolve({ id: "inv-1" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.data.qrCode).toEqual({ hasActive: false, expiresAt: null });
    expect(body.data.qrEmailDelivery).toBeNull();
  });
});
