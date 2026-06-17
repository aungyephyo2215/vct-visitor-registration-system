import { describe, it, expect } from "vitest";
import { getTemplate } from "../templates";
import type { NotificationType } from "@/generated/prisma/enums";

const ALL_TYPES: NotificationType[] = [
  "INVITATION_CREATED",
  "INVITATION_APPROVED",
  "INVITATION_REJECTED",
  "QR_GENERATED",
  "VISITOR_VERIFIED",
  "CHECKED_IN",
  "CHECKED_OUT",
];

describe("getTemplate", () => {
  const ctx = { inviter: "Alice", visitor: "Bob", type: "GUEST", reason: "N/A" };

  it.each(ALL_TYPES)("returns non-empty title and message for %s", (type) => {
    const template = getTemplate(type, ctx);
    expect(template.title).toBeTruthy();
    expect(template.message).toBeTruthy();
    expect(typeof template.title).toBe("string");
    expect(typeof template.message).toBe("string");
  });

  it("INVITATION_CREATED interpolates inviter, visitor, and type", () => {
    const t = getTemplate("INVITATION_CREATED", { inviter: "Joe", visitor: "Kim", type: "VIP" });
    expect(t.message).toContain("Joe");
    expect(t.message).toContain("Kim");
    expect(t.message).toContain("VIP");
  });

  it("INVITATION_REJECTED includes reason", () => {
    const t = getTemplate("INVITATION_REJECTED", { visitor: "X", reason: "No entry" });
    expect(t.message).toContain("No entry");
  });

  it("CHECKED_IN message contains visitor name", () => {
    const t = getTemplate("CHECKED_IN", { visitor: "Jane" });
    expect(t.message).toContain("Jane");
    expect(t.title).toBe("Visitor Arrived");
  });

  it("CHECKED_OUT message contains visitor name", () => {
    const t = getTemplate("CHECKED_OUT", { visitor: "Jane" });
    expect(t.message).toContain("Jane");
    expect(t.title).toBe("Visitor Departed");
  });
});
