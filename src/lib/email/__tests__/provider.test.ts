import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../providers/smtp", () => ({
  smtpEmailProvider: {
    name: "smtp",
    send: vi.fn(),
  },
}));

import { getEmailProvider } from "../provider";
import { noopEmailProvider } from "../providers/noop";
import { mockEmailProvider } from "../providers/mock";
import { smtpEmailProvider } from "../providers/smtp";

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
  delete process.env.EMAIL_PROVIDER;
});

describe("getEmailProvider", () => {
  it("defaults to noop when EMAIL_PROVIDER is unset", () => {
    expect(getEmailProvider()).toBe(noopEmailProvider);
  });

  it("returns the noop provider when configured", () => {
    process.env.EMAIL_PROVIDER = "noop";
    expect(getEmailProvider()).toBe(noopEmailProvider);
  });

  it("returns the mock provider when configured", () => {
    process.env.EMAIL_PROVIDER = "mock";
    expect(getEmailProvider()).toBe(mockEmailProvider);
  });

  it("returns the smtp provider when configured", () => {
    process.env.EMAIL_PROVIDER = "smtp";
    expect(getEmailProvider()).toBe(smtpEmailProvider);
  });

  it("throws a clear error for unsupported providers", () => {
    process.env.EMAIL_PROVIDER = "carrier-pigeon";
    expect(() => getEmailProvider()).toThrowError(/Unsupported email provider/i);
  });
});
