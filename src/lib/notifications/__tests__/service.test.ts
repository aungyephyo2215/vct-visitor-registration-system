import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn().mockResolvedValue({ id: "notif-1" });
const mockCreateMany = vi.fn().mockResolvedValue({ count: 2 });
const mockFindMany = vi.fn().mockResolvedValue([{ id: "u1" }, { id: "u2" }]);

const mockPrisma = {
  notification: {
    create: mockCreate,
    createMany: mockCreateMany,
  },
  user: {
    findMany: mockFindMany,
  },
} as unknown as import("@/generated/prisma/client").PrismaClient;

import { sendNotification, sendBulkNotifications, getApproverRecipients } from "../service";

beforeEach(() => {
  mockCreate.mockClear();
  mockCreateMany.mockClear();
  mockFindMany.mockClear();
  mockCreate.mockResolvedValue({ id: "notif-1" });
  mockCreateMany.mockResolvedValue({ count: 2 });
  mockFindMany.mockResolvedValue([{ id: "u1" }, { id: "u2" }]);
});

describe("sendNotification", () => {
  it("creates notification with user and property connects", async () => {
    mockCreate.mockResolvedValue({ id: "n1" });
    await sendNotification(
      mockPrisma,
      "INVITATION_APPROVED",
      { kind: "invitation", invitedBy: "inviter-1" },
      { visitor: "Bob" },
      "prop-1",
      "inv-1",
    );
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const call = mockCreate.mock.calls[0][0];
    expect(call.data.user).toEqual({ connect: { id: "inviter-1" } });
    expect(call.data.property).toEqual({ connect: { id: "prop-1" } });
    expect(call.data.type).toBe("INVITATION_APPROVED");
    expect(call.data.title).toBe("Invitation Approved");
  });

  it("does nothing when no recipients (host null)", async () => {
    await sendNotification(
      mockPrisma,
      "CHECKED_IN",
      { kind: "visit", hostUserId: null },
      { visitor: "Bob" },
      "prop-1",
      "v-1",
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("does nothing for INVITATION_CREATED (handled by bulk)", async () => {
    await sendNotification(
      mockPrisma,
      "INVITATION_CREATED",
      { kind: "invitation", invitedBy: "x" },
      { inviter: "A", visitor: "B", type: "GUEST" },
      "prop-1",
      "inv-1",
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("swallows error silently when create fails", async () => {
    mockCreate.mockRejectedValue(new Error("DB down"));
    await expect(
      sendNotification(
        mockPrisma,
        "INVITATION_APPROVED",
        { kind: "invitation", invitedBy: "inviter-1" },
        { visitor: "Bob" },
        "prop-1",
        "inv-1",
      ),
    ).resolves.toBeUndefined();
  });
});

describe("sendBulkNotifications", () => {
  it("calls createMany for multiple users with flat fields", async () => {
    await sendBulkNotifications(
      mockPrisma,
      ["u1", "u2"],
      "INVITATION_CREATED",
      { inviter: "A", visitor: "B", type: "GUEST" },
      "prop-1",
      "inv-1",
    );
    expect(mockCreateMany).toHaveBeenCalledTimes(1);
    const call = mockCreateMany.mock.calls[0][0];
    expect(call.data).toHaveLength(2);
    expect(call.data[0].user_id).toBe("u1");
    expect(call.data[1].user_id).toBe("u2");
    expect(call.data[0].type).toBe("INVITATION_CREATED");
    expect(call.data[0].title).toBe("New Invitation");
    expect(call.skipDuplicates).toBe(true);
  });

  it("does nothing when userIds is empty", async () => {
    await sendBulkNotifications(
      mockPrisma,
      [],
      "INVITATION_CREATED",
      { inviter: "A", visitor: "B", type: "GUEST" },
      "prop-1",
      "inv-1",
    );
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it("swallows errors silently", async () => {
    mockCreateMany.mockRejectedValue(new Error("DB down"));
    await expect(
      sendBulkNotifications(
        mockPrisma,
        ["u1"],
        "INVITATION_CREATED",
        { inviter: "A", visitor: "B", type: "GUEST" },
        "prop-1",
        "inv-1",
      ),
    ).resolves.toBeUndefined();
  });
});

describe("getApproverRecipients", () => {
  it("returns APPROVAL_ROLES user IDs for property", async () => {
    const ids = await getApproverRecipients(mockPrisma, "prop-1");
    expect(ids).toEqual(["u1", "u2"]);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          property_id: "prop-1",
          role: { in: ["SUPER_ADMIN", "PROPERTY_ADMIN", "OFFICE_STAFF"] },
        }),
      }),
    );
  });

  it("returns empty array on error", async () => {
    mockFindMany.mockRejectedValue(new Error("DB down"));
    const ids = await getApproverRecipients(mockPrisma, "prop-1");
    expect(ids).toEqual([]);
  });
});
