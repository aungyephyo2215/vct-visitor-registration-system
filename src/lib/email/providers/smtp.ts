import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

import type { EmailMessageInput, EmailProvider, EmailSendResult } from "../types";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  requireTLS: boolean;
  auth: {
    user: string;
    pass: string;
  };
  timeoutMs: number;
  from: string;
  replyTo?: string;
}

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (value == null || value.trim() === "") return fallback;
  return value.trim().toLowerCase() === "true";
}

function parsePositiveInteger(
  value: string | undefined,
  fieldName: string,
  fallback?: number,
): number {
  if (value == null || value.trim() === "") {
    if (fallback != null) return fallback;
    throw new Error(`${fieldName} is required`);
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a valid integer`);
  }

  return parsed;
}

export function getSmtpConfig(): SmtpConfig {
  const missing = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_SECURE",
    "SMTP_USER",
    "SMTP_PASS",
    "EMAIL_FROM",
  ].filter((name) => !process.env[name] || process.env[name]?.trim() === "");

  if (missing.length > 0) {
    throw new Error(`Missing required SMTP environment variables: ${missing.join(", ")}`);
  }

  return {
    host: process.env.SMTP_HOST!.trim(),
    port: parsePositiveInteger(process.env.SMTP_PORT, "SMTP_PORT"),
    secure: parseBoolean(process.env.SMTP_SECURE),
    requireTLS: parseBoolean(process.env.SMTP_REQUIRE_TLS),
    auth: {
      user: process.env.SMTP_USER!.trim(),
      pass: process.env.SMTP_PASS!,
    },
    timeoutMs: parsePositiveInteger(process.env.QR_EMAIL_TIMEOUT_MS, "QR_EMAIL_TIMEOUT_MS", 10000),
    from: process.env.EMAIL_FROM!.trim(),
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || undefined,
  };
}

export function createSmtpTransport(config = getSmtpConfig()): Transporter {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: config.requireTLS,
    auth: config.auth,
    connectionTimeout: config.timeoutMs,
    greetingTimeout: config.timeoutMs,
    socketTimeout: config.timeoutMs,
  });
}

function normalizeSmtpError(error: unknown): Pick<EmailSendResult, "errorCode" | "errorMessage"> {
  if (error instanceof Error) {
    const smtpError = error as Error & { code?: string };
    return {
      errorCode: smtpError.code || "SMTP_SEND_FAILED",
      errorMessage: error.message,
    };
  }

  return {
    errorCode: "SMTP_SEND_FAILED",
    errorMessage: "Unknown SMTP error",
  };
}

export const smtpEmailProvider: EmailProvider = {
  name: "smtp",
  async send(message: EmailMessageInput): Promise<EmailSendResult> {
    const config = getSmtpConfig();
    const transport = createSmtpTransport(config);

    try {
      const result = await transport.sendMail({
        from: message.from ?? config.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: message.replyTo ?? config.replyTo,
      });

      return {
        success: true,
        provider: "smtp",
        messageId: result.messageId,
      };
    } catch (error) {
      return {
        success: false,
        provider: "smtp",
        ...normalizeSmtpError(error),
      };
    }
  },
};
