export type EmailProviderName = "noop" | "mock" | "smtp";

export interface EmailMessageInput {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  metadata?: Record<string, unknown>;
}

export interface EmailSendResult {
  success: boolean;
  provider: EmailProviderName;
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface EmailProvider {
  name: EmailProviderName;
  send(message: EmailMessageInput): Promise<EmailSendResult>;
}

export type QrEmailDeliveryStatusValue = "PENDING" | "SENT" | "FAILED" | "SKIPPED";
export type QrEmailDeliveryTriggerTypeValue = "AUTO" | "MANUAL_RESEND";

export interface QrEmailSendParams {
  invitationId: string;
  qrCodeId: string;
  rawToken: string;
  triggerType?: QrEmailDeliveryTriggerTypeValue;
  createdBy?: string;
}

export interface QrEmailDeliverySummary {
  deliveryId: string;
  attempted: boolean;
  status: QrEmailDeliveryStatusValue;
  recipientEmail: string | null;
  provider: string;
  triggerType: QrEmailDeliveryTriggerTypeValue;
  providerMessageId?: string | null;
  failureCode?: string | null;
  failureMessage?: string | null;
  sentAt?: Date | null;
}
