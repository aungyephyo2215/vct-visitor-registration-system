import { describe, it, expect } from "vitest";
import {
  loginSchema,
  visitorCreateSchema,
  visitorUpdateSchema,
  visitCreateSchema,
  visitUpdateSchema,
  invitationCreateSchema,
  invitationUpdateSchema,
  invitationRejectSchema,
  paginationSchema,
  checkoutSchema,
  checkinSchema,
  formatZodErrors,
} from "../validations";

// ─── loginSchema ────────────────────────────────────────────────

describe("loginSchema", () => {
  it("accepts valid login payload", () => {
    const result = loginSchema.safeParse({ email: "a@b.com", password: "p" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({ email: "not-email", password: "p" });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({ email: "a@b.com", password: "" });
    expect(result.success).toBe(false);
  });
});

// ─── visitorCreateSchema ────────────────────────────────────────

describe("visitorCreateSchema", () => {
  const valid = {
    name: "John",
    phone: "+959123456789",
    id_type: "NRC",
    id_number: "12/ABC(N)123456",
  } as const;

  it("accepts valid visitor", () => {
    expect(visitorCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(visitorCreateSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("rejects invalid id_type", () => {
    expect(visitorCreateSchema.safeParse({ ...valid, id_type: "INVALID" }).success).toBe(false);
  });

  it("rejects invalid photo_url", () => {
    expect(visitorCreateSchema.safeParse({ ...valid, photo_url: "not-a-url" }).success).toBe(false);
  });

  it("allows nullable photo_url", () => {
    expect(visitorCreateSchema.safeParse({ ...valid, photo_url: null }).success).toBe(true);
  });

  it("allows optional property_id", () => {
    const withoutProp = { name: "John", phone: "+95", id_type: "NRC", id_number: "X" };
    expect(visitorCreateSchema.safeParse(withoutProp).success).toBe(true);
  });
});

// ─── visitorUpdateSchema ────────────────────────────────────────

describe("visitorUpdateSchema", () => {
  it("accepts partial update", () => {
    expect(visitorUpdateSchema.safeParse({ name: "Jane" }).success).toBe(true);
  });

  it("accepts empty object (all fields optional)", () => {
    expect(visitorUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("rejects invalid phone when provided", () => {
    // phone has min(1) — empty string fails
    expect(visitorUpdateSchema.safeParse({ phone: "" }).success).toBe(false);
  });
});

// ─── visitCreateSchema ──────────────────────────────────────────

describe("visitCreateSchema", () => {
  const valid = {
    visitor_id: "v1",
    unit_id: "u1",
    purpose: "FAMILY_VISIT",
  } as const;

  it("accepts valid visit", () => {
    expect(visitCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid purpose", () => {
    expect(visitCreateSchema.safeParse({ ...valid, purpose: "INVALID" }).success).toBe(false);
  });

  it("allows optional host_user_id null", () => {
    expect(visitCreateSchema.safeParse({ ...valid, host_user_id: null }).success).toBe(true);
  });

  it("rejects notes over 500 chars", () => {
    expect(visitCreateSchema.safeParse({ ...valid, notes: "x".repeat(501) }).success).toBe(false);
  });
});

// ─── visitUpdateSchema ──────────────────────────────────────────

describe("visitUpdateSchema", () => {
  it("accepts partial update", () => {
    expect(visitUpdateSchema.safeParse({ purpose: "DELIVERY" }).success).toBe(true);
  });

  it("rejects invalid status", () => {
    expect(visitUpdateSchema.safeParse({ status: "DELETED" }).success).toBe(false);
  });

  it("accepts CHECKED_IN status", () => {
    expect(visitUpdateSchema.safeParse({ status: "CHECKED_IN" }).success).toBe(true);
  });
});

// ─── invitationCreateSchema ─────────────────────────────────────

describe("invitationCreateSchema", () => {
  const valid = {
    visitor_name: "Alice",
    visitor_phone: "+959111222333",
    visitor_type: "GUEST",
    unit_id: "u1",
    expected_date: "2026-06-20",
  } as const;

  it("accepts valid invitation", () => {
    expect(invitationCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts all visitor types", () => {
    const types = [
      "GUEST",
      "FAMILY",
      "VIP",
      "VENDOR",
      "CONTRACTOR",
      "DELIVERY",
      "AUDITOR",
      "GOVERNMENT",
    ];
    for (const t of types) {
      expect(invitationCreateSchema.safeParse({ ...valid, visitor_type: t }).success).toBe(true);
    }
  });

  it("rejects empty visitor_name", () => {
    expect(invitationCreateSchema.safeParse({ ...valid, visitor_name: "" }).success).toBe(false);
  });

  it("rejects invalid visitor_email", () => {
    expect(invitationCreateSchema.safeParse({ ...valid, visitor_email: "bad" }).success).toBe(
      false,
    );
  });

  it("allows nullable visitor_email", () => {
    expect(invitationCreateSchema.safeParse({ ...valid, visitor_email: null }).success).toBe(true);
  });
});

// ─── invitationUpdateSchema ─────────────────────────────────────

describe("invitationUpdateSchema", () => {
  it("accepts partial update with visitor fields", () => {
    expect(invitationUpdateSchema.safeParse({ visitor_name: "Jane" }).success).toBe(true);
  });

  it("accepts visitor_email update", () => {
    expect(invitationUpdateSchema.safeParse({ visitor_email: "jane@test.com" }).success).toBe(true);
  });

  it("accepts notes update", () => {
    expect(invitationUpdateSchema.safeParse({ notes: "New notes" }).success).toBe(true);
  });

  it("strips status field (not in schema)", () => {
    const result = invitationUpdateSchema.safeParse({ status: "APPROVED" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("status");
    }
  });
});

// ─── invitationRejectSchema ─────────────────────────────────────

describe("invitationRejectSchema", () => {
  it("requires reason", () => {
    expect(invitationRejectSchema.safeParse({}).success).toBe(false);
  });

  it("accepts valid reason", () => {
    expect(invitationRejectSchema.safeParse({ reason: "Not allowed" }).success).toBe(true);
  });
});

// ─── other schemas ──────────────────────────────────────────────

describe("checkinSchema", () => {
  it("requires token", () => {
    expect(checkinSchema.safeParse({}).success).toBe(false);
  });

  it("accepts valid token", () => {
    expect(checkinSchema.safeParse({ token: "tok_123" }).success).toBe(true);
  });
});

describe("checkoutSchema", () => {
  it("requires visit_id", () => {
    expect(checkoutSchema.safeParse({}).success).toBe(false);
  });
});

describe("paginationSchema", () => {
  it("provides defaults for empty input", () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it("coerces string numbers", () => {
    const result = paginationSchema.safeParse({ page: "3", limit: "10" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(10);
    }
  });

  it("rejects page < 1", () => {
    expect(paginationSchema.safeParse({ page: "0" }).success).toBe(false);
  });

  it("rejects limit > 100", () => {
    expect(paginationSchema.safeParse({ limit: "101" }).success).toBe(false);
  });

  it("allows optional search and status", () => {
    const result = paginationSchema.safeParse({ search: "foo", status: "ACTIVE" });
    expect(result.success).toBe(true);
  });
});

// ─── formatZodErrors ────────────────────────────────────────────

describe("formatZodErrors", () => {
  it("formats errors with field path and message", () => {
    const result = loginSchema.safeParse({ email: "", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatZodErrors(result.error);
      expect(formatted).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "email" }),
          expect.objectContaining({ field: "password" }),
        ]),
      );
    }
  });
});
