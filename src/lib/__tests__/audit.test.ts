import { describe, it, expect, vi } from "vitest";
import { createAuditLog } from "../audit";

function createMockPrisma() {
  return {
    property: {
      findFirst: vi.fn().mockResolvedValue({ id: "property-123" }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "audit-1" }),
    },
  };
}

describe("createAuditLog", () => {
  it("creates an audit log with all provided fields", async () => {
    const prisma = createMockPrisma();

    await createAuditLog({
      prisma: prisma as never,
      property_id: "prop-1",
      user_id: "user-1",
      action: "LOGIN",
      resource_type: "session",
      resource_id: "session-1",
      ip_address: "192.168.1.1",
      user_agent: "Mozilla/5.0",
      metadata: { key: "value" },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledOnce();
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        property_id: "prop-1",
        user_id: "user-1",
        action: "LOGIN",
        resource_type: "session",
        resource_id: "session-1",
        ip_address: "192.168.1.1",
        user_agent: "Mozilla/5.0",
        metadata: { key: "value" },
      },
    });
  });

  it("uses default property_id when none provided", async () => {
    const prisma = createMockPrisma();
    prisma.property.findFirst.mockResolvedValue({ id: "default-prop" });

    await createAuditLog({
      prisma: prisma as never,
      action: "CHECK_IN",
      resource_type: "visit",
    });

    const dataArg = prisma.auditLog.create.mock.calls[0][0].data;
    expect(dataArg.property_id).toBe("default-prop");
    expect(prisma.property.findFirst).toHaveBeenCalledWith({
      where: { status: "ACTIVE" },
    });
  });

  it("falls back to seed-property-01 when no active property exists", async () => {
    const prisma = createMockPrisma();
    prisma.property.findFirst.mockResolvedValue(null);

    await createAuditLog({
      prisma: prisma as never,
      action: "CHECK_IN",
      resource_type: "visit",
    });

    const dataArg = prisma.auditLog.create.mock.calls[0][0].data;
    expect(dataArg.property_id).toBe("seed-property-01");
  });

  it("defaults user_id to null when not provided", async () => {
    const prisma = createMockPrisma();

    await createAuditLog({
      prisma: prisma as never,
      property_id: "prop-1",
      action: "FAILED_QR_SCAN",
      resource_type: "qr_code",
    });

    const dataArg = prisma.auditLog.create.mock.calls[0][0].data;
    expect(dataArg.user_id).toBeNull();
  });

  it("defaults resource_id to null when not provided", async () => {
    const prisma = createMockPrisma();

    await createAuditLog({
      prisma: prisma as never,
      property_id: "prop-1",
      action: "LOGIN",
      resource_type: "session",
    });

    const dataArg = prisma.auditLog.create.mock.calls[0][0].data;
    expect(dataArg.resource_id).toBeNull();
  });

  it("defaults ip_address to 'unknown' when not provided", async () => {
    const prisma = createMockPrisma();

    await createAuditLog({
      prisma: prisma as never,
      property_id: "prop-1",
      action: "LOGIN",
      resource_type: "session",
    });

    const dataArg = prisma.auditLog.create.mock.calls[0][0].data;
    expect(dataArg.ip_address).toBe("unknown");
  });

  it("defaults user_agent to 'unknown' when not provided", async () => {
    const prisma = createMockPrisma();

    await createAuditLog({
      prisma: prisma as never,
      property_id: "prop-1",
      action: "LOGIN",
      resource_type: "session",
    });

    const dataArg = prisma.auditLog.create.mock.calls[0][0].data;
    expect(dataArg.user_agent).toBe("unknown");
  });

  it("accepts all valid audit actions", async () => {
    const prisma = createMockPrisma();
    const actions = [
      "LOGIN",
      "LOGOUT",
      "CREATE_VISITOR",
      "UPDATE_VISITOR",
      "DELETE_VISITOR",
      "CREATE_VISIT",
      "UPDATE_VISIT",
      "GENERATE_QR",
      "MANUAL_RESEND_QR_EMAIL",
      "CHECK_IN",
      "CHECK_OUT",
      "FAILED_QR_SCAN",
      "MANUAL_CHECKOUT",
      "BLOCKLIST_MATCH",
      "CREATE_INVITATION",
      "UPDATE_INVITATION",
      "DELETE_INVITATION",
      "APPROVE_INVITATION",
      "REJECT_INVITATION",
      "VERIFY_VISITOR",
      "ATTACH_VISITOR",
      "CREATE_VEHICLE",
      "UPDATE_VEHICLE",
      "DELETE_VEHICLE",
      "BLOCK_VEHICLE",
    ];

    for (const action of actions) {
      prisma.auditLog.create.mockClear();
      await createAuditLog({
        prisma: prisma as never,
        property_id: "prop-1",
        action: action as never,
        resource_type: "test",
      });
      expect(prisma.auditLog.create).toHaveBeenCalledOnce();
    }
  });

  it("returns the created audit log", async () => {
    const prisma = createMockPrisma();
    prisma.auditLog.create.mockResolvedValue({ id: "audit-42", action: "LOGIN" });

    const result = await createAuditLog({
      prisma: prisma as never,
      property_id: "prop-1",
      action: "LOGIN",
      resource_type: "session",
    });

    expect(result).toEqual({ id: "audit-42", action: "LOGIN" });
  });
});
