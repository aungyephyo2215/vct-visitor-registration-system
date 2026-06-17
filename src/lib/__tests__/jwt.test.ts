import { describe, it, expect, beforeAll } from "vitest";
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getAccessTokenMaxAge,
  getRefreshTokenMaxAge,
} from "../jwt";

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-min-32-chars!!";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-32chars!";
  process.env.JWT_EXPIRES_IN = "1h";
  process.env.JWT_REFRESH_EXPIRES_IN = "7d";
});

describe("signAccessToken / verifyAccessToken", () => {
  const payload = { sub: "user-1", email: "test@vrs.com", role: "RESIDENT" };

  it("round-trips: sign then verify returns payload", async () => {
    const token = await signAccessToken(payload);
    expect(token).toBeTruthy();
    const decoded = await verifyAccessToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.sub).toBe("user-1");
    expect(decoded!.email).toBe("test@vrs.com");
    expect(decoded!.role).toBe("RESIDENT");
  });

  it("returns null for invalid token", async () => {
    const result = await verifyAccessToken("garbage");
    expect(result).toBeNull();
  });

  it("returns null for empty token", async () => {
    const result = await verifyAccessToken("");
    expect(result).toBeNull();
  });
});

describe("signRefreshToken / verifyRefreshToken", () => {
  const payload = { sub: "user-1" };

  it("round-trips with refresh secrets", async () => {
    const token = await signRefreshToken(payload);
    const decoded = await verifyRefreshToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.sub).toBe("user-1");
  });

  it("access token verification fails on refresh-token-signed jwt", async () => {
    const refreshToken = await signRefreshToken({ sub: "user-2" });
    // Should fail because access token verifier uses different secret
    const decoded = await verifyAccessToken(refreshToken);
    expect(decoded).toBeNull();
  });
});

describe("getAccessTokenMaxAge / getRefreshTokenMaxAge", () => {
  it("parses 1h to 3600 seconds", () => {
    expect(getAccessTokenMaxAge()).toBe(3600);
  });

  it("parses 7d to 604800 seconds", () => {
    expect(getRefreshTokenMaxAge()).toBe(604800);
  });

  it("falls back to 24h when env var is unset or malformed", async () => {
    // Temporarily unset
    const orig = process.env.JWT_EXPIRES_IN;
    delete (process.env as Record<string, string>).JWT_EXPIRES_IN;
    // parseDuration returns 86400 for malformed empty/undefined
    const maxAge = getAccessTokenMaxAge();
    process.env.JWT_EXPIRES_IN = orig;
    expect(maxAge).toBe(86400);
  });
});
