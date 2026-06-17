import { describe, it, expect } from "vitest";
import { requireRole, canAccessProperty, requirePropertyAccess } from "../rbac";
import type { SafeUser } from "../types";

function makeUser(overrides: Partial<SafeUser> = {}): SafeUser {
  return {
    id: "u1",
    property_id: "prop-1",
    unit_id: null,
    name: "Test User",
    email: "test@vrs.com",
    role: "RESIDENT",
    status: "ACTIVE",
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

describe("requireRole", () => {
  it("allows if user has required role", () => {
    expect(() => requireRole(makeUser({ role: "RESIDENT" }), "RESIDENT")).not.toThrow();
  });

  it("allows if user has one of multiple roles", () => {
    expect(() =>
      requireRole(makeUser({ role: "SECURITY_GUARD" }), "RESIDENT", "SECURITY_GUARD"),
    ).not.toThrow();
  });

  it("throws 403 if role not in allowed list", () => {
    expect(() => requireRole(makeUser({ role: "RESIDENT" }), "SUPER_ADMIN")).toThrow();
  });

  it("throws with message listing allowed roles", () => {
    try {
      requireRole(makeUser({ role: "RESIDENT" }), "SUPER_ADMIN");
      expect.unreachable();
    } catch (err) {
      expect((err as Response).status).toBe(403);
    }
  });
});

describe("canAccessProperty", () => {
  it("allows SUPER_ADMIN to access any property", () => {
    expect(
      canAccessProperty(makeUser({ role: "SUPER_ADMIN", property_id: null }), "any-prop"),
    ).toBe(true);
  });

  it("allows user with matching property_id", () => {
    expect(canAccessProperty(makeUser({ property_id: "prop-1" }), "prop-1")).toBe(true);
  });

  it("denies user with different property_id", () => {
    expect(canAccessProperty(makeUser({ property_id: "prop-1" }), "prop-2")).toBe(false);
  });

  it("denies non-admin with null property_id", () => {
    expect(canAccessProperty(makeUser({ role: "RESIDENT", property_id: null }), "prop-1")).toBe(
      false,
    );
  });
});

describe("requirePropertyAccess", () => {
  it("does not throw when property matches", () => {
    expect(() =>
      requirePropertyAccess(makeUser({ property_id: "prop-1" }), "prop-1"),
    ).not.toThrow();
  });

  it("throws 403 when property does not match", () => {
    expect(() => requirePropertyAccess(makeUser({ property_id: "prop-1" }), "prop-2")).toThrow();
  });
});
