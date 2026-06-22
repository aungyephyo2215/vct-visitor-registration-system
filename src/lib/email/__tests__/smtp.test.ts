import { describe, it, expect, beforeEach } from "vitest";

import { getSmtpConfig } from "../providers/smtp";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_SECURE;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.SMTP_REQUIRE_TLS;
  delete process.env.QR_EMAIL_TIMEOUT_MS;
  delete process.env.EMAIL_FROM;
  delete process.env.EMAIL_REPLY_TO;
});

describe("getSmtpConfig", () => {
  it("parses smtp env values into a normalized config", () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_SECURE = "false";
    process.env.SMTP_USER = "mailer";
    process.env.SMTP_PASS = "secret";
    process.env.SMTP_REQUIRE_TLS = "true";
    process.env.QR_EMAIL_TIMEOUT_MS = "15000";
    process.env.EMAIL_FROM = "Visitor Registration <no-reply@example.com>";
    process.env.EMAIL_REPLY_TO = "support@example.com";

    expect(getSmtpConfig()).toEqual({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: "mailer",
        pass: "secret",
      },
      timeoutMs: 15000,
      from: "Visitor Registration <no-reply@example.com>",
      replyTo: "support@example.com",
    });
  });

  it("throws when required smtp values are missing", () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    expect(() => getSmtpConfig()).toThrowError(/Missing required SMTP environment variables/i);
  });

  it("throws when smtp port is invalid", () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "abc";
    process.env.SMTP_SECURE = "false";
    process.env.SMTP_USER = "mailer";
    process.env.SMTP_PASS = "secret";
    process.env.EMAIL_FROM = "Visitor Registration <no-reply@example.com>";

    expect(() => getSmtpConfig()).toThrowError(/SMTP_PORT must be a valid integer/i);
  });
});
