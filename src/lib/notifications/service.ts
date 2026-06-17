import type { PrismaClient } from "@/generated/prisma/client";
import type { NotificationType } from "@/generated/prisma/enums";
import { buildNotificationFields } from "./builder";
import {
  getRecipients,
  getResourceType,
  getActionUrl,
  type NotificationResource,
} from "./recipients";

/**
 * Fire-and-forget: sends one notification to one recipient.
 * Errors are silently caught — notification failure must never break the parent operation.
 */
export async function sendNotification(
  prisma: PrismaClient,
  type: NotificationType,
  resource: NotificationResource,
  context: Record<string, string>,
  propertyId: string,
  resourceId: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const recipients = getRecipients(type, resource);
  if (recipients.length === 0) return;

  const userId = recipients[0];
  const resourceType = getResourceType(type);
  const actionUrl = getActionUrl(type, resourceId);

  try {
    const fields = buildNotificationFields({
      type,
      userId,
      propertyId,
      resourceType,
      resourceId,
      actionUrl,
      context,
      metadata,
    });
    await prisma.notification.create({
      data: {
        type: fields.type,
        title: fields.title,
        message: fields.message,
        resource_type: fields.resource_type,
        resource_id: fields.resource_id,
        action_url: fields.action_url,
        metadata: fields.metadata,
        user: { connect: { id: userId } },
        property: { connect: { id: propertyId } },
      },
    });
  } catch {
    // Silently drop — notification failure must never fail the parent operation
  }
}

/**
 * Fire-and-forget: sends the same notification to multiple recipients.
 * Uses createMany with skipDuplicates for safety.
 */
export async function sendBulkNotifications(
  prisma: PrismaClient,
  userIds: string[],
  type: NotificationType,
  context: Record<string, string>,
  propertyId: string,
  resourceId: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (userIds.length === 0) return;

  const template = buildNotificationFields({
    type,
    userId: "", // placeholder, overridden per row
    propertyId,
    resourceType: getResourceType(type),
    resourceId,
    actionUrl: getActionUrl(type, resourceId),
    context,
    metadata,
  });

  try {
    await prisma.notification.createMany({
      data: userIds.map((uid) => ({
        ...template,
        user_id: uid,
        property_id: propertyId,
      })),
      skipDuplicates: true,
    });
  } catch {
    // Silently drop
  }
}

/**
 * Returns all admin/office-staff user IDs in a property for broadcasting.
 */
export async function getApproverRecipients(
  prisma: PrismaClient,
  propertyId: string,
): Promise<string[]> {
  try {
    const users = await prisma.user.findMany({
      where: {
        property_id: propertyId,
        role: { in: ["SUPER_ADMIN", "PROPERTY_ADMIN", "OFFICE_STAFF"] },
        status: "ACTIVE",
        deleted_at: null,
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  } catch {
    return [];
  }
}
