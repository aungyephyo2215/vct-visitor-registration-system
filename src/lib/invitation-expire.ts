import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Bulk-expires stale PENDING invitations whose expected_date has passed.
 * Safe: only touches PENDING rows with past expected_date.
 * Returns the count of expired invitations.
 */
export async function expireStaleInvitations(prisma: PrismaClient): Promise<number> {
  const result = await prisma.invitation.updateMany({
    where: {
      status: "PENDING",
      deleted_at: null,
      expected_date: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });

  return result.count;
}
