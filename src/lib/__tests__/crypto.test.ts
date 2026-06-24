import { describe, it, expect } from "vitest";
import { hashToken } from "../crypto";

describe("hashToken", () => {
  it("returns a 64-character hex string", () => {
    const hash = hashToken("test-token");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — same input produces same output", () => {
    const hash1 = hashToken("my-token");
    const hash2 = hashToken("my-token");
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different inputs", () => {
    const hash1 = hashToken("token-a");
    const hash2 = hashToken("token-b");
    expect(hash1).not.toBe(hash2);
  });

  it("produces the correct SHA-256 hash for a known value", () => {
    // SHA-256 of "hello" is known
    const hash = hashToken("hello");
    expect(hash).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  });

  it("handles UUID-format tokens", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const hash = hashToken(uuid);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles empty string", () => {
    const hash = hashToken("");
    expect(hash).toHaveLength(64);
    // SHA-256 of empty string is known
    expect(hash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });
});
