import type { NotificationType } from "@/generated/prisma/enums";

export type NotificationTemplate = {
  title: string;
  message: string;
};

const TEMPLATES: Record<NotificationType, (ctx: Record<string, string>) => NotificationTemplate> = {
  INVITATION_CREATED: (ctx) => ({
    title: "New Invitation",
    message: `${ctx.inviter} invited ${ctx.visitor} (${ctx.type})`,
  }),
  INVITATION_APPROVED: (ctx) => ({
    title: "Invitation Approved",
    message: `Your invitation for ${ctx.visitor} has been approved`,
  }),
  INVITATION_REJECTED: (ctx) => ({
    title: "Invitation Rejected",
    message: `Your invitation for ${ctx.visitor} was rejected: ${ctx.reason}`,
  }),
  QR_GENERATED: (ctx) => ({
    title: "QR Code Ready",
    message: `QR code for ${ctx.visitor} is ready to share`,
  }),
  VISITOR_VERIFIED: (ctx) => ({
    title: "Visitor Verified",
    message: `${ctx.visitor} has been verified by security`,
  }),
  CHECKED_IN: (ctx) => ({
    title: "Visitor Arrived",
    message: `${ctx.visitor} has checked in`,
  }),
  CHECKED_OUT: (ctx) => ({
    title: "Visitor Departed",
    message: `${ctx.visitor} has checked out`,
  }),
};

export function getTemplate(
  type: NotificationType,
  context: Record<string, string>,
): NotificationTemplate {
  const factory = TEMPLATES[type];
  if (!factory) throw new Error(`Unknown notification type: ${type}`);
  return factory(context);
}
