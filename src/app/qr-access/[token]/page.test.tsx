import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { mockResolvePublicQrAccessByToken, mockNotFound } = vi.hoisted(() => ({
  mockResolvePublicQrAccessByToken: vi.fn(),
  mockNotFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/email/public-qr-access", () => ({
  resolvePublicQrAccessByToken: mockResolvePublicQrAccessByToken,
}));

vi.mock("next/navigation", () => ({
  notFound: mockNotFound,
}));

import PublicQrAccessPage from "./page";

describe("PublicQrAccessPage", () => {
  it("renders visitor, property, unit, visit, and QR image details", async () => {
    mockResolvePublicQrAccessByToken.mockResolvedValue({
      visitorName: "Aung Kyaw",
      propertyName: "Victory Residence",
      propertyAddress: "No. 1 Victory Road, Yangon",
      unitLabel: "Floor 12 / Unit 12B",
      hostName: "Daw Mya",
      visitDateLabel: "2026-06-22",
      visitTimeLabel: "10:30 AM",
      qrImageUrl: "https://visitor.example.com/api/v1/qr/email-image/opaque-token",
      emailAccessToken: "opaque-token",
    });

    const element = await PublicQrAccessPage({
      params: Promise.resolve({ token: "opaque-token" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Aung Kyaw");
    expect(html).toContain("Victory Residence");
    expect(html).toContain("Floor 12 / Unit 12B");
    expect(html).toContain("2026-06-22");
    expect(html).toContain("10:30 AM");
    expect(html).toContain("api/v1/qr/email-image/opaque-token");
    expect(html).not.toContain("rawToken");
  });

  it("returns notFound when the token is invalid", async () => {
    mockResolvePublicQrAccessByToken.mockResolvedValue(null);

    await expect(
      PublicQrAccessPage({
        params: Promise.resolve({ token: "missing" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
