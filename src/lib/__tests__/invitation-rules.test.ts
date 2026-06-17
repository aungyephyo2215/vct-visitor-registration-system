import { describe, it, expect } from "vitest";
import {
  canApproveInvitation,
  canRejectInvitation,
  canGenerateQr,
  canViewInvitation,
  canUpdateInvitation,
  canDeleteInvitation,
  isStaleInvitation,
  filterStaleInvitations,
} from "../invitation-rules";
import type { SafeUser } from "../types";

function makeUser(overrides: Partial<SafeUser> = {}): SafeUser {
  return {
    id: "u1",
    property_id: "prop-1",
    unit_id: null,
    name: "Test",
    email: "test@vrs.com",
    role: "RESIDENT",
    status: "ACTIVE",
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

// ─── canApproveInvitation ───────────────────────────────────────

describe("canApproveInvitation", () => {
  it("allows PROPERTY_ADMIN to approve PENDING", () => {
    expect(canApproveInvitation("PENDING", "PROPERTY_ADMIN")).toBe(true);
  });

  it("allows SUPER_ADMIN to approve PENDING", () => {
    expect(canApproveInvitation("PENDING", "SUPER_ADMIN")).toBe(true);
  });

  it("allows OFFICE_STAFF to approve PENDING", () => {
    expect(canApproveInvitation("PENDING", "OFFICE_STAFF")).toBe(true);
  });

  it("denies RESIDENT from approving", () => {
    expect(canApproveInvitation("PENDING", "RESIDENT")).toBe(false);
  });

  it("denies SECURITY_GUARD from approving", () => {
    expect(canApproveInvitation("PENDING", "SECURITY_GUARD")).toBe(false);
  });

  it("denies APPROVED status (already approved)", () => {
    expect(canApproveInvitation("APPROVED", "PROPERTY_ADMIN")).toBe(false);
  });

  it("denies REJECTED status", () => {
    expect(canApproveInvitation("REJECTED", "PROPERTY_ADMIN")).toBe(false);
  });

  it("denies EXPIRED status", () => {
    expect(canApproveInvitation("EXPIRED", "PROPERTY_ADMIN")).toBe(false);
  });

  it("denies CANCELLED status", () => {
    expect(canApproveInvitation("CANCELLED", "PROPERTY_ADMIN")).toBe(false);
  });
});

// ─── canRejectInvitation ────────────────────────────────────────

describe("canRejectInvitation", () => {
  it("allows PROPERTY_ADMIN to reject PENDING", () => {
    expect(canRejectInvitation("PENDING", "PROPERTY_ADMIN")).toBe(true);
  });

  it("denies RESIDENT from rejecting", () => {
    expect(canRejectInvitation("PENDING", "RESIDENT")).toBe(false);
  });

  it("denies APPROVED status (cannot reject after approval)", () => {
    expect(canRejectInvitation("APPROVED", "PROPERTY_ADMIN")).toBe(false);
  });
});

// ─── canGenerateQr ──────────────────────────────────────────────

describe("canGenerateQr", () => {
  it("allows when APPROVED and no existing QR", () => {
    expect(canGenerateQr("APPROVED", false, "PROPERTY_ADMIN")).toBe(true);
  });

  it("allows SECURITY_GUARD to generate QR", () => {
    expect(canGenerateQr("APPROVED", false, "SECURITY_GUARD")).toBe(true);
  });

  it("denies when status is PENDING", () => {
    expect(canGenerateQr("PENDING", false, "PROPERTY_ADMIN")).toBe(false);
  });

  it("denies when status is REJECTED", () => {
    expect(canGenerateQr("REJECTED", false, "PROPERTY_ADMIN")).toBe(false);
  });

  it("denies when status is EXPIRED", () => {
    expect(canGenerateQr("EXPIRED", true, "PROPERTY_ADMIN")).toBe(false);
  });

  it("denies when QR already generated", () => {
    expect(canGenerateQr("APPROVED", true, "PROPERTY_ADMIN")).toBe(false);
  });

  it("denies RESIDENT from generating QR", () => {
    expect(canGenerateQr("APPROVED", false, "RESIDENT")).toBe(false);
  });
});

// ─── canViewInvitation ──────────────────────────────────────────

describe("canViewInvitation", () => {
  const invitation = { invited_by: "user-a", property_id: "prop-1" };

  it("allows PROPERTY_ADMIN to view any invitation in property", () => {
    expect(canViewInvitation(makeUser({ role: "PROPERTY_ADMIN", id: "admin-1" }), invitation)).toBe(
      true,
    );
  });

  it("allows RESIDENT to view own invitation", () => {
    expect(canViewInvitation(makeUser({ role: "RESIDENT", id: "user-a" }), invitation)).toBe(true);
  });

  it("denies RESIDENT from viewing another resident's invitation", () => {
    expect(canViewInvitation(makeUser({ role: "RESIDENT", id: "user-b" }), invitation)).toBe(false);
  });

  it("allows SUPER_ADMIN to view any invitation", () => {
    expect(
      canViewInvitation(makeUser({ role: "SUPER_ADMIN", id: "super-1" }), {
        ...invitation,
        invited_by: "other",
      }),
    ).toBe(true);
  });
});

// ─── canUpdateInvitation ────────────────────────────────────────

describe("canUpdateInvitation", () => {
  const invitation = { invited_by: "user-a" };

  it("allows owner RESIDENT to update PENDING", () => {
    expect(
      canUpdateInvitation("PENDING", makeUser({ role: "RESIDENT", id: "user-a" }), invitation),
    ).toBe(true);
  });

  it("denies non-owner RESIDENT from updating", () => {
    expect(
      canUpdateInvitation("PENDING", makeUser({ role: "RESIDENT", id: "user-b" }), invitation),
    ).toBe(false);
  });

  it("allows PROPERTY_ADMIN to update PENDING", () => {
    expect(
      canUpdateInvitation(
        "PENDING",
        makeUser({ role: "PROPERTY_ADMIN", id: "admin-1" }),
        invitation,
      ),
    ).toBe(true);
  });

  it("denies update on APPROVED invitation", () => {
    expect(canUpdateInvitation("APPROVED", makeUser({ role: "PROPERTY_ADMIN" }), invitation)).toBe(
      false,
    );
  });

  it("denies update on REJECTED invitation", () => {
    expect(canUpdateInvitation("REJECTED", makeUser({ role: "PROPERTY_ADMIN" }), invitation)).toBe(
      false,
    );
  });

  it("denies update on EXPIRED invitation", () => {
    expect(canUpdateInvitation("EXPIRED", makeUser({ role: "PROPERTY_ADMIN" }), invitation)).toBe(
      false,
    );
  });
});

// ─── canDeleteInvitation ────────────────────────────────────────

describe("canDeleteInvitation", () => {
  const invitation = { invited_by: "user-a" };

  it("allows owner RESIDENT to delete own invitation", () => {
    expect(canDeleteInvitation(makeUser({ role: "RESIDENT", id: "user-a" }), invitation)).toBe(
      true,
    );
  });

  it("denies non-owner RESIDENT from deleting", () => {
    expect(canDeleteInvitation(makeUser({ role: "RESIDENT", id: "user-b" }), invitation)).toBe(
      false,
    );
  });

  it("allows PROPERTY_ADMIN to delete any invitation", () => {
    expect(
      canDeleteInvitation(makeUser({ role: "PROPERTY_ADMIN", id: "admin-1" }), invitation),
    ).toBe(true);
  });

  it("allows SUPER_ADMIN to delete any invitation", () => {
    expect(canDeleteInvitation(makeUser({ role: "SUPER_ADMIN", id: "super-1" }), invitation)).toBe(
      true,
    );
  });
});

// ─── isStaleInvitation ──────────────────────────────────────────

describe("isStaleInvitation", () => {
  it("returns true for PENDING with past date", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isStaleInvitation("PENDING", yesterday.toISOString())).toBe(true);
  });

  it("returns false for PENDING with future date", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isStaleInvitation("PENDING", tomorrow.toISOString())).toBe(false);
  });

  it("returns false for APPROVED with past date", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isStaleInvitation("APPROVED", yesterday.toISOString())).toBe(false);
  });

  it("returns false for REJECTED with past date", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isStaleInvitation("REJECTED", yesterday.toISOString())).toBe(false);
  });

  it("returns false for CANCELLED with past date", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isStaleInvitation("CANCELLED", yesterday.toISOString())).toBe(false);
  });
});

// ─── filterStaleInvitations ─────────────────────────────────────

describe("filterStaleInvitations", () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const list = [
    { status: "PENDING", expected_date: yesterday.toISOString(), id: "1" },
    { status: "PENDING", expected_date: tomorrow.toISOString(), id: "2" },
    { status: "APPROVED", expected_date: yesterday.toISOString(), id: "3" },
    { status: "PENDING", expected_date: yesterday.toISOString(), id: "4" },
  ];

  it("returns only stale PENDING items", () => {
    const stale = filterStaleInvitations(list);
    expect(stale).toHaveLength(2);
    expect(stale.map((s) => s.id)).toEqual(["1", "4"]);
  });

  it("returns empty for all-fresh list", () => {
    const allFresh = [
      { status: "PENDING", expected_date: tomorrow.toISOString(), id: "a" },
      { status: "APPROVED", expected_date: yesterday.toISOString(), id: "b" },
    ];
    expect(filterStaleInvitations(allFresh)).toHaveLength(0);
  });
});
