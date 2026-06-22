import { describe, expect, it, vi } from "vitest";

import { resolvePublicQrAccessByToken } from "../public-qr-access";

const mockQrEmailDeliveryFindUnique = vi.fn();

const mockPrisma = {
  qrEmailDelivery: {
    findUnique: mockQrEmailDeliveryFindUnique,
  },
} as unknown as import("@/generated/prisma/client").PrismaClient;

function buildDelivery(overrides: Record<string, unknown> = {}) {
  return {
    id: "delivery-1",
    email_access_token: "opaque-token",
    status: "SENT",
    expires_at: new Date("2026-06-23T10:30:00.000Z"),
    invitation: {
      id: "inv-1",
      visitor_name: "Aung Kyaw",
      expected_date: new Date("2026-06-22T00:00:00.000Z"),
      expected_time: "10:30 AM",
      status: "APPROVED",
      deleted_at: null,
      property: {
        id: "prop-1",
        name: "Victory Residence",
        address: "No. 1 Victory Road, Yangon",
      },
      unit: {
        id: "unit-1",
        unit_no: "12B",
        floor: 12,
      },
    },
    visit: {
      id: "visit-1",
      status: "EXPECTED",
      expected_checkin_time: new Date("2026-06-22T10:30:00.000Z"),
      host: {
        id: "user-1",
        name: "Daw Mya",
      },
    },
    qrCode: {
      id: "qr-1",
      status: "ACTIVE",
      expires_at: new Date("2026-06-23T10:30:00.000Z"),
      used_at: null,
      revoked_at: null,
    },
    ...overrides,
  };
}

describe("resolvePublicQrAccessByToken", () => {
  it("returns safe public QR access data for a valid SENT delivery token", async () => {
    process.env.APP_BASE_URL = "https://visitor.example.com";
    mockQrEmailDeliveryFindUnique.mockResolvedValue(buildDelivery());

    const result = await resolvePublicQrAccessByToken(mockPrisma, "opaque-token");

    expect(result).toMatchObject({
      emailAccessToken: "opaque-token",
      visitorName: "Aung Kyaw",
      propertyName: "Victory Residence",
      propertyAddress: "No. 1 Victory Road, Yangon",
      unitLabel: "Floor 12 / Unit 12B",
      hostName: "Daw Mya",
      qrImageUrl: "https://visitor.example.com/api/v1/qr/email-image/opaque-token",
      qrPayloadUrl: "https://visitor.example.com/qr-access/opaque-token",
    });
    expect(JSON.stringify(result)).not.toContain("rawToken");
  });

  it("returns null when the delivery token is expired", async () => {
    mockQrEmailDeliveryFindUnique.mockResolvedValue(
      buildDelivery({ expires_at: new Date("2026-06-20T10:30:00.000Z") }),
    );

    const result = await resolvePublicQrAccessByToken(
      mockPrisma,
      "opaque-token",
      new Date("2026-06-22T10:30:00.000Z"),
    );

    expect(result).toBeNull();
  });

  it("returns null when the linked QR code is no longer active", async () => {
    mockQrEmailDeliveryFindUnique.mockResolvedValue(
      buildDelivery({
        qrCode: {
          id: "qr-1",
          status: "USED",
          expires_at: new Date("2026-06-23T10:30:00.000Z"),
          used_at: new Date("2026-06-22T09:00:00.000Z"),
          revoked_at: null,
        },
      }),
    );

    const result = await resolvePublicQrAccessByToken(mockPrisma, "opaque-token");

    expect(result).toBeNull();
  });
});
