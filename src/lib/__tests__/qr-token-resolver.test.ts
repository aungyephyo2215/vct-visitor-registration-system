import { describe, it, expect } from "vitest";
import { extractToken } from "../qr-token-resolver";

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
