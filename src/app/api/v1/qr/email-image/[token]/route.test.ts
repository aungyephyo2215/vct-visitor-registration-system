import { describe, expect, it, vi } from "vitest";

const { mockResolvePublicQrAccessByToken, mockToBuffer } = vi.hoisted(() => ({
  mockResolvePublicQrAccessByToken: vi.fn(),
  mockToBuffer: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/email/public-qr-access", () => ({
  resolvePublicQrAccessByToken: mockResolvePublicQrAccessByToken,
}));

vi.mock("qrcode", () => ({
  toBuffer: mockToBuffer,
  default: {
    toBuffer: mockToBuffer,
  },
}));

import { GET } from "./route";

describe("GET /api/v1/qr/email-image/[token]", () => {
  it("returns image/png generated from the safe public payload", async () => {
    mockResolvePublicQrAccessByToken.mockResolvedValue({
      qrPayloadUrl: "https://visitor.example.com/qr-access/opaque-token",
    });
    mockToBuffer.mockResolvedValue(Buffer.from("png-bytes"));

    const response = await GET(
      new Request("https://visitor.example.com/api/v1/qr/email-image/opaque-token"),
      {
        params: Promise.resolve({ token: "opaque-token" }),
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(mockToBuffer).toHaveBeenCalledWith(
      "https://visitor.example.com/qr-access/opaque-token",
      expect.objectContaining({ type: "png" }),
    );
    expect(mockToBuffer.mock.calls[0][0]).not.toContain("rawToken");
  });

  it("returns 404 when the token is invalid or unavailable", async () => {
    mockResolvePublicQrAccessByToken.mockResolvedValue(null);

    const response = await GET(
      new Request("https://visitor.example.com/api/v1/qr/email-image/missing"),
      {
        params: Promise.resolve({ token: "missing" }),
      },
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { message: "QR image not found" },
    });
  });
});
