import { describe, it, expect, vi, beforeEach } from "vitest";
import { expireStaleInvitations } from "../invitation-expire";

function createMockPrisma() {
  return {
    invitation: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
}

describe("expireStaleInvitations", () => {
  it("calls updateMany with correct where clause", async () => {
    const prisma = createMockPrisma();
    prisma.invitation.updateMany.mockResolvedValue({ count: 3 });

    const count = await expireStaleInvitations(prisma as never);

    expect(prisma.invitation.updateMany).toHaveBeenCalledOnce();
    expect(prisma.invitation.updateMany).toHaveBeenCalledWith({
      where: {
        status: "PENDING",
        deleted_at: null,
        expected_date: { lt: expect.any(Date) },
      },
      data: { status: "EXPIRED" },
    });
    expect(count).toBe(3);
  });

  it("returns 0 when no invitations match", async () => {
    const prisma = createMockPrisma();
    prisma.invitation.updateMany.mockResolvedValue({ count: 0 });

    const count = await expireStaleInvitations(prisma as never);

    expect(count).toBe(0);
  });

  it("returns the exact count from updateMany", async () => {
    const prisma = createMockPrisma();
    prisma.invitation.updateMany.mockResolvedValue({ count: 42 });

    const count = await expireStaleInvitations(prisma as never);

    expect(count).toBe(42);
  });

  it("only sets status to EXPIRED", async () => {
    const prisma = createMockPrisma();

    await expireStaleInvitations(prisma as never);

    const dataArg = prisma.invitation.updateMany.mock.calls[0][0].data;
    expect(dataArg).toEqual({ status: "EXPIRED" });
  });

  it("filters out deleted invitations via deleted_at: null", async () => {
    const prisma = createMockPrisma();

    await expireStaleInvitations(prisma as never);

    const whereArg = prisma.invitation.updateMany.mock.calls[0][0].where;
    expect(whereArg.deleted_at).toBeNull();
  });

  it("only targets PENDING status", async () => {
    const prisma = createMockPrisma();

    await expireStaleInvitations(prisma as never);

    const whereArg = prisma.invitation.updateMany.mock.calls[0][0].where;
    expect(whereArg.status).toBe("PENDING");
  });

  it("only targets past expected_date", async () => {
    const prisma = createMockPrisma();

    await expireStaleInvitations(prisma as never);

    const whereArg = prisma.invitation.updateMany.mock.calls[0][0].where;
    expect(whereArg.expected_date).toEqual({ lt: expect.any(Date) });
    // The date should be roughly "now"
    const ltDate = whereArg.expected_date.lt as Date;
    const diff = Date.now() - ltDate.getTime();
    expect(diff).toBeLessThan(1000); // within 1 second of now
  });
});
