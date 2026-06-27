import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRequireAuth,
  mockRequireRole,
  mockRequirePropertyAccess,
  mockResolveQrToken,
  consoleErrorSpy,
} = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockRequireRole: vi.fn(),
  mockRequirePropertyAccess: vi.fn(),
  mockResolveQrToken: vi.fn(),
  consoleErrorSpy: vi.spyOn(console, "error").mockImplementation(() => {}),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock("@/lib/rbac", () => ({
  requireRole: mockRequireRole,
  requirePropertyAccess: mockRequirePropertyAccess,
}));

vi.mock("@/lib/qr-token-resolver", () => ({
  resolveQrToken: mockResolveQrToken,
}));

import { GET } from "./route";

function makeLookup(status: string, qrStatus = "ACTIVE") {
  return {
    id: `qr-${status.toLowerCase()}`,
    property_id: "prop-1",
    visit_id: `visit-${status.toLowerCase()}`,
    status: qrStatus,
    expires_at: new Date("2026-06-27T15:11:55.121Z"),
    used_at: null,
    revoked_at: null,
    visit: {
      id: `visit-${status.toLowerCase()}`,
      property_id: "prop-1",
      visitor_id: "visitor-1",
      unit_id: "unit-1",
      host_user_id: "host-1",
      purpose: "DELIVERY",
      notes: null,
      expected_checkin_time: new Date("2026-06-27T15:11:55.121Z"),
      status,
      checkin_time:
        status === "CHECKED_IN" || status === "CHECKED_OUT"
          ? new Date("2026-06-27T15:15:00.000Z")
          : null,
      checkout_time: status === "CHECKED_OUT" ? new Date("2026-06-27T16:00:00.000Z") : null,
      property: { id: "prop-1", name: "Seed Property" },
      visitor: {
        id: "visitor-1",
        name: "QA Visitor",
        phone: "555-0001",
        id_type: "PASSPORT",
        id_number: "A1234567",
        photo_url: null,
      },
      verification:
        status === "EXPECTED"
          ? null
          : {
              id: "verification-1",
              photo_url: null,
              vehicle_number: null,
              nda_signed: true,
              safety_form_signed: true,
            },
      unit: { id: "unit-1", unit_no: "A-101", floor: 1 },
      host: { id: "host-1", name: "Host User" },
      invitations: [],
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy.mockClear();
  mockRequireAuth.mockResolvedValue({
    id: "guard-1",
    property_id: "prop-1",
    role: "SECURITY_GUARD",
  });
});

describe("GET /api/v1/qr/lookup", () => {
  it("returns visit data for a raw QR token lookup", async () => {
    mockResolveQrToken.mockResolvedValue(makeLookup("EXPECTED"));

    const response = await GET(
      new NextRequest("https://app.example.com/api/v1/qr/lookup?token=raw-token-123"),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(mockResolveQrToken).toHaveBeenCalledWith({}, "raw-token-123");
    expect(body).toEqual({
      success: true,
      data: {
        qr: {
          id: "qr-expected",
          status: "ACTIVE",
          expires_at: expect.any(String),
        },
        visit: expect.objectContaining({
          id: "visit-expected",
          status: "EXPECTED",
        }),
      },
    });
  });

  it("returns visit data for an email QR URL lookup", async () => {
    mockResolveQrToken.mockResolvedValue(makeLookup("EXPECTED"));

    const response = await GET(
      new NextRequest(
        "https://app.example.com/api/v1/qr/lookup?token=https%3A%2F%2Fapp.example.com%2Fqr-access%2F550e8400-e29b-41d4-a716-446655440000",
      ),
    );

    expect(response.status).toBe(200);
    expect(mockResolveQrToken).toHaveBeenCalledWith(
      {},
      "https://app.example.com/qr-access/550e8400-e29b-41d4-a716-446655440000",
    );
  });

  it("returns clean 404 instead of 500 for an invalid token", async () => {
    mockResolveQrToken.mockResolvedValue(null);

    const response = await GET(
      new NextRequest("https://app.example.com/api/v1/qr/lookup?token=missing-token"),
    );

    expect(response.status).toBe(404);
    expect(response.status).not.toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: { message: "Invalid QR code" },
    });
  });

  it("returns expired QR data without crashing", async () => {
    mockResolveQrToken.mockResolvedValue(makeLookup("EXPECTED", "EXPIRED"));

    const response = await GET(
      new NextRequest("https://app.example.com/api/v1/qr/lookup?token=expired-token"),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.qr.status).toBe("EXPIRED");
    expect(body.data.visit.status).toBe("EXPECTED");
  });

  it("returns checked-in visit data without crashing", async () => {
    mockResolveQrToken.mockResolvedValue(makeLookup("CHECKED_IN"));

    const response = await GET(
      new NextRequest("https://app.example.com/api/v1/qr/lookup?token=checked-in-token"),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.visit.status).toBe("CHECKED_IN");
  });

  it("returns checked-out visit data without crashing", async () => {
    mockResolveQrToken.mockResolvedValue(makeLookup("CHECKED_OUT"));

    const response = await GET(
      new NextRequest("https://app.example.com/api/v1/qr/lookup?token=checked-out-token"),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.visit.status).toBe("CHECKED_OUT");
  });
});
