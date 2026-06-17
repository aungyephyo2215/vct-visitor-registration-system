import type { NotificationType, NotificationResourceType } from "@/generated/prisma/enums";

export interface InvitationResource {
  kind: "invitation";
  invitedBy: string;
}

export interface VisitResource {
  kind: "visit";
  hostUserId: string | null;
}

export type NotificationResource = InvitationResource | VisitResource;

export function getRecipients(type: NotificationType, resource: NotificationResource): string[] {
  switch (type) {
    case "INVITATION_CREATED":
      // Handled separately — requires DB query for all approvers in property
      return [];

    case "INVITATION_APPROVED":
    case "INVITATION_REJECTED":
    case "QR_GENERATED": {
      if (resource.kind === "invitation") {
        return [resource.invitedBy];
      }
      return [];
    }

    case "VISITOR_VERIFIED":
    case "CHECKED_IN":
    case "CHECKED_OUT": {
      if (resource.kind === "visit") {
        return resource.hostUserId ? [resource.hostUserId] : [];
      }
      return [];
    }

    default:
      return [];
  }
}

export function getResourceType(type: NotificationType): NotificationResourceType {
  switch (type) {
    case "INVITATION_CREATED":
    case "INVITATION_APPROVED":
    case "INVITATION_REJECTED":
      return "invitation";
    case "QR_GENERATED":
      return "visit";
    case "VISITOR_VERIFIED":
    case "CHECKED_IN":
    case "CHECKED_OUT":
      return "visit";
    default:
      return "visit";
  }
}

export function getActionUrl(type: NotificationType, resourceId: string | null): string | null {
  if (!resourceId) return null;
  switch (type) {
    case "INVITATION_CREATED":
    case "INVITATION_APPROVED":
    case "INVITATION_REJECTED":
      return `/invitations/${resourceId}`;
    case "QR_GENERATED":
    case "VISITOR_VERIFIED":
    case "CHECKED_IN":
    case "CHECKED_OUT":
      return `/visits/${resourceId}`;
    default:
      return null;
  }
}
