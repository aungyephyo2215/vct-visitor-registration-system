import { describe, it, expect } from "vitest";
import { buildNotificationFields } from "../builder";
import type { NotificationType } from "@/generated/prisma/enums";

const BASE = {
  type: "CHECKED_IN" as NotificationType,
  userId: "user-1",
  propertyId: "prop-1",
  resourceType: "visit" as const,
  resourceId: "visit-1",
  actionUrl: "/visits/visit-1",
  context: { visitor: "Jane" },
};

describe("buildNotificationFields", () => {
  it("returns flat data with user_id and property_id", () => {
    const data = buildNotificationFields(BASE);
    expect(data.user_id).toBe("user-1");
    expect(data.property_id).toBe("prop-1");
  });

  it("sets type, title, and message from template", () => {
    const data = buildNotificationFields(BASE);
    expect(data.type).toBe("CHECKED_IN");
    expect(data.title).toBe("Visitor Arrived");
    expect(data.message).toContain("Jane");
  });

  it("sets resource_type, resource_id, and action_url", () => {
    const data = buildNotificationFields(BASE);
    expect(data.resource_type).toBe("visit");
    expect(data.resource_id).toBe("visit-1");
    expect(data.action_url).toBe("/visits/visit-1");
  });

  it("sets metadata when provided", () => {
    const data = buildNotificationFields({ ...BASE, metadata: { foo: "bar" } });
    expect(data.metadata).toEqual({ foo: "bar" });
  });

  it("omits metadata when not provided", () => {
    const data = buildNotificationFields(BASE);
    expect(data.metadata).toBeUndefined();
  });

  it("sets action_url to null when not provided", () => {
    const data = buildNotificationFields({ ...BASE, actionUrl: null });
    expect(data.action_url).toBeNull();
  });
});
