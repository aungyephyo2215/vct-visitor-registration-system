import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit } from "../rate-limit";

describe("checkRateLimit", () => {
  describe("in test environment (NODE_ENV=test)", () => {
    it("returns unlimited when NODE_ENV is test", () => {
      const result = checkRateLimit("test-key");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
      expect(result.resetAt).toBe(Infinity);
    });

    it("returns unlimited regardless of config", () => {
      const result = checkRateLimit("test-key", { maxRequests: 1, windowMs: 1000 });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
    });

    it("does not track state between calls", () => {
      // Even with maxRequests: 1, multiple calls should all be allowed
      for (let i = 0; i < 100; i++) {
        const result = checkRateLimit("test-key", { maxRequests: 1, windowMs: 1000 });
        expect(result.allowed).toBe(true);
      }
    });
  });

  describe("rate limiting logic (non-test environment)", () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      // Temporarily set NODE_ENV to enable rate limiting
      process.env.NODE_ENV = "production";
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it("allows first request within window", () => {
      const result = checkRateLimit("rl-1", { maxRequests: 3, windowMs: 60_000 });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it("tracks remaining count correctly", () => {
      const key = "rl-2";
      const config = { maxRequests: 3, windowMs: 60_000 };

      const r1 = checkRateLimit(key, config);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(2);

      const r2 = checkRateLimit(key, config);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(1);

      const r3 = checkRateLimit(key, config);
      expect(r3.allowed).toBe(true);
      expect(r3.remaining).toBe(0);
    });

    it("blocks when limit is exceeded", () => {
      const key = "rl-3";
      const config = { maxRequests: 2, windowMs: 60_000 };

      checkRateLimit(key, config); // count=1
      checkRateLimit(key, config); // count=2
      const r3 = checkRateLimit(key, config); // count=3 — exceeded

      expect(r3.allowed).toBe(false);
      expect(r3.remaining).toBe(0);
    });

    it("returns resetAt as a future timestamp", () => {
      const key = "rl-4";
      const config = { maxRequests: 5, windowMs: 30_000 };

      const result = checkRateLimit(key, config);
      const expectedReset = Date.now() + 30_000;

      // Allow 1 second tolerance
      expect(Math.abs(result.resetAt - expectedReset)).toBeLessThan(1000);
    });

    it("resets after window expires", async () => {
      const key = "rl-5";
      const config = { maxRequests: 1, windowMs: 100 }; // 100ms window

      checkRateLimit(key, config); // count=1
      const blocked = checkRateLimit(key, config); // exceeded
      expect(blocked.allowed).toBe(false);

      // Wait for window to expire
      await new Promise((r) => setTimeout(r, 150));

      const reset = checkRateLimit(key, config); // new window
      expect(reset.allowed).toBe(true);
      expect(reset.remaining).toBe(0);
    });

    it("uses different keys independently", () => {
      const config = { maxRequests: 1, windowMs: 60_000 };

      checkRateLimit("key-a", config); // a=1
      const r1 = checkRateLimit("key-a", config); // a=2 — blocked
      expect(r1.allowed).toBe(false);

      const r2 = checkRateLimit("key-b", config); // b=1 — still allowed
      expect(r2.allowed).toBe(true);
    });
  });
});
