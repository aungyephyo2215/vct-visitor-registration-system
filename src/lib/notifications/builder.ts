import type { NotificationType, NotificationResourceType } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { getTemplate } from "./templates";

export interface BuildNotificationParams {
  type: NotificationType;
  userId: string;
  actionUrl?: string | null;
  propertyId: string;
  resourceType: NotificationResourceType;
  resourceId: string | null;
  context: Record<string, string>;
  metadata?: Record<string, unknown>;
}

/**
 * Returns flat notification fields (no relations).
 * Use sendNotification() for create() — it adds user/property connects.
 * Use sendBulkNotifications() for createMany() — it uses flat user_id/property_id directly.
 */
export function buildNotificationFields(params: BuildNotificationParams) {
  const template = getTemplate(params.type, params.context);
  return {
    user_id: params.userId,
    property_id: params.propertyId,
    type: params.type,
    title: template.title,
    message: template.message,
    resource_type: params.resourceType,
    resource_id: params.resourceId,
    action_url: params.actionUrl ?? null,
    metadata: params.metadata as Prisma.InputJsonValue | undefined,
  };
}
