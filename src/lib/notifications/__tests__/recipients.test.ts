import { describe, it, expect } from "vitest";
import { getRecipients, getResourceType, getActionUrl } from "../recipients";
import type { NotificationType } from "@/generated/prisma/enums";

describe("getRecipients", () => {
  it("returns empty for INVITATION_CREATED (handled by bulk)", () => {
    expect(getRecipients("INVITATION_CREATED", { kind: "invitation", invitedBy: "u1" })).toEqual(
      [],
    );
  });

  it("returns inviter for INVITATION_APPROVED", () => {
    expect(getRecipients("INVITATION_APPROVED", { kind: "invitation", invitedBy: "u1" })).toEqual([
      "u1",
    ]);
  });

  it("returns inviter for INVITATION_REJECTED", () => {
    expect(getRecipients("INVITATION_REJECTED", { kind: "invitation", invitedBy: "u1" })).toEqual([
      "u1",
    ]);
  });

  it("returns inviter for QR_GENERATED", () => {
    expect(getRecipients("QR_GENERATED", { kind: "invitation", invitedBy: "u2" })).toEqual(["u2"]);
  });

  it("returns host for VISITOR_VERIFIED when host set", () => {
    expect(getRecipients("VISITOR_VERIFIED", { kind: "visit", hostUserId: "host-1" })).toEqual([
      "host-1",
    ]);
  });

  it("returns empty for VISITOR_VERIFIED when host is null", () => {
    expect(getRecipients("VISITOR_VERIFIED", { kind: "visit", hostUserId: null })).toEqual([]);
  });

  it("returns host for CHECKED_IN", () => {
    expect(getRecipients("CHECKED_IN", { kind: "visit", hostUserId: "host-2" })).toEqual([
      "host-2",
    ]);
  });

  it("returns empty for CHECKED_IN when host is null", () => {
    expect(getRecipients("CHECKED_IN", { kind: "visit", hostUserId: null })).toEqual([]);
  });

  it("returns host for CHECKED_OUT", () => {
    expect(getRecipients("CHECKED_OUT", { kind: "visit", hostUserId: "host-3" })).toEqual([
      "host-3",
    ]);
  });

  it("returns empty for CHECKED_OUT when host is null", () => {
    expect(getRecipients("CHECKED_OUT", { kind: "visit", hostUserId: null })).toEqual([]);
  });

  it("returns empty for unknown type", () => {
    expect(
      getRecipients("UNKNOWN" as NotificationType, { kind: "visit", hostUserId: "x" }),
    ).toEqual([]);
  });
});

describe("getResourceType", () => {
  it("returns invitation for invitation events", () => {
    expect(getResourceType("INVITATION_CREATED")).toBe("invitation");
    expect(getResourceType("INVITATION_APPROVED")).toBe("invitation");
    expect(getResourceType("INVITATION_REJECTED")).toBe("invitation");
  });

  it("returns visit for visit events", () => {
    expect(getResourceType("QR_GENERATED")).toBe("visit");
    expect(getResourceType("VISITOR_VERIFIED")).toBe("visit");
    expect(getResourceType("CHECKED_IN")).toBe("visit");
    expect(getResourceType("CHECKED_OUT")).toBe("visit");
  });
});

describe("getActionUrl", () => {
  it("returns invitation path for invitation events", () => {
    expect(getActionUrl("INVITATION_CREATED", "inv-1")).toBe("/invitations/inv-1");
    expect(getActionUrl("INVITATION_APPROVED", "inv-2")).toBe("/invitations/inv-2");
    expect(getActionUrl("INVITATION_REJECTED", "inv-3")).toBe("/invitations/inv-3");
  });

  it("returns visit path for visit events", () => {
    expect(getActionUrl("QR_GENERATED", "v-1")).toBe("/visits/v-1");
    expect(getActionUrl("CHECKED_IN", "v-2")).toBe("/visits/v-2");
    expect(getActionUrl("CHECKED_OUT", "v-3")).toBe("/visits/v-3");
  });

  it("returns null when resourceId is null", () => {
    expect(getActionUrl("CHECKED_IN", null)).toBeNull();
  });
});
