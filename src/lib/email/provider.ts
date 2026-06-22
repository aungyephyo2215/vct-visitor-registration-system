import { mockEmailProvider } from "./providers/mock";
import { noopEmailProvider } from "./providers/noop";
import { smtpEmailProvider } from "./providers/smtp";
import type { EmailProvider, EmailProviderName } from "./types";

export const DEFAULT_EMAIL_PROVIDER: EmailProviderName = "noop";

export function getConfiguredEmailProviderName(): EmailProviderName {
  const configured = process.env.EMAIL_PROVIDER?.trim().toLowerCase();

  if (!configured) {
    return DEFAULT_EMAIL_PROVIDER;
  }

  if (configured === "noop" || configured === "mock" || configured === "smtp") {
    return configured;
  }

  throw new Error(`Unsupported email provider: ${configured}. Expected one of: noop, mock, smtp`);
}

export function getEmailProvider(): EmailProvider {
  switch (getConfiguredEmailProviderName()) {
    case "noop":
      return noopEmailProvider;
    case "mock":
      return mockEmailProvider;
    case "smtp":
      return smtpEmailProvider;
  }
}
