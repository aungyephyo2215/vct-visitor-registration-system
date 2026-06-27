import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashToken } from "@/lib/crypto";
import { extractToken, resolveQrToken } from "../qr-token-resolver";

const sampleQrLookup = {
  id: "qr-1",
  property_id: "prop-1",
  visit_id: "visit-1",
  status: "ACTIVE",
  expires_at: new Date("2026-06-27T15:11:55.121Z"),
  used_at: null,
  revoked_at: null,
  visit: {
    id: "visit-1",
    property_id: "prop-1",
    visitor_id: "visitor-1",
    unit_id: "unit-1",
    host_user_id: "host-1",
    purpose: "DELIVERY",
    notes: null,
    expected_checkin_time: new Date("2026-06-27T15:11:55.121Z"),
    status: "EXPECTED",
    checkin_time: null,
    checkout_time: null,
    property: { id: "prop-1", name: "Seed Property" },
    visitor: {
      id: "visitor-1",
      name: "QA Visitor",
      phone: "555-0001",
      id_type: "PASSPORT",
      id_number: "A1234567",
      photo_url: null,
    },
    verification: null,
    unit: { id: "unit-1", unit_no: "A-101", floor: 1 },
    host: { id: "host-1", name: "Host User" },
    invitations: [],
  },
};

describe("extractToken", () => {
  it("returns raw token unchanged", () => {
    expect(extractToken("aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789")).toBe(
      "aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789",
    );
  });

  it("extracts token from full URL", () => {
    expect(
      extractToken(
        "https://vct-visitor-registration-system.vercel.app/qr-access/550e8400-e29b-41d4-a716-446655440000",
      ),
    ).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("extracts token from URL with trailing slash", () => {
    expect(extractToken("https://domain.com/qr-access/abc123/")).toBe("abc123");
  });

  it("extracts token from URL with query params", () => {
    expect(extractToken("https://domain.com/qr-access/abc123?ref=email")).toBe("abc123");
  });

  it("extracts token from URL with fragment", () => {
    expect(extractToken("https://domain.com/qr-access/abc123#section")).toBe("abc123");
  });

  it("handles URL-encoded token", () => {
    expect(extractToken("https://domain.com/qr-access/token%2Bwith%2Bplus")).toBe(
      "token+with+plus",
    );
  });

  it("returns UUID unchanged when not a URL", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(extractToken(uuid)).toBe(uuid);
  });

  it("trims whitespace", () => {
    expect(extractToken("  abc123  ")).toBe("abc123");
  });

  it("returns empty string for empty input", () => {
    expect(extractToken("")).toBe("");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(extractToken("   ")).toBe("");
  });

  it("does not extract token from unrelated URL", () => {
    expect(extractToken("https://example.com/other/path")).toBe("https://example.com/other/path");
  });

  it("handles localhost URL", () => {
    expect(extractToken("http://localhost:3000/qr-access/test-token")).toBe("test-token");
  });
});

describe("resolveQrToken", () => {
  const findQrCode = vi.fn();
  const findEmailDelivery = vi.fn();
  const prisma = {
    qRCode: { findUnique: findQrCode },
    qrEmailDelivery: { findUnique: findEmailDelivery },
  } as const;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("looks up a raw QR token by hashed token", async () => {
    findQrCode.mockResolvedValue(sampleQrLookup);

    const result = await resolveQrToken(prisma as never, "raw-token-123");

    expect(findQrCode).toHaveBeenCalledWith({
      where: { token_hash: hashToken("raw-token-123") },
      select: expect.objectContaining({
        id: true,
        property_id: true,
        visit: expect.any(Object),
      }),
    });
    expect(findEmailDelivery).not.toHaveBeenCalled();
    expect(result).toEqual(sampleQrLookup);
  });

  it("resolves a full email QR URL through QrEmailDelivery first", async () => {
    findEmailDelivery.mockResolvedValue({
      id: "delivery-1",
      status: "SENT",
      expires_at: new Date("2026-06-27T15:11:55.121Z"),
      qr_code_id: "qr-1",
    });
    findQrCode.mockResolvedValue(sampleQrLookup);

    const result = await resolveQrToken(
      prisma as never,
      "https://app.example.com/qr-access/550e8400-e29b-41d4-a716-446655440000?ref=email",
    );

    expect(findEmailDelivery).toHaveBeenCalledWith({
      where: { email_access_token_hash: hashToken("550e8400-e29b-41d4-a716-446655440000") },
      select: {
        id: true,
        status: true,
        expires_at: true,
        qr_code_id: true,
      },
    });
    expect(findQrCode).toHaveBeenCalledWith({
      where: { id: "qr-1" },
      select: expect.objectContaining({
        id: true,
        property_id: true,
        visit: expect.any(Object),
      }),
    });
    expect(result).toEqual(sampleQrLookup);
  });

  it("returns null for an invalid token when neither lookup finds a record", async () => {
    findQrCode.mockResolvedValue(null);
    findEmailDelivery.mockResolvedValue(null);

    const result = await resolveQrToken(prisma as never, "missing-token");

    expect(result).toBeNull();
    expect(findQrCode).toHaveBeenCalledOnce();
    expect(findEmailDelivery).toHaveBeenCalledOnce();
  });
});
