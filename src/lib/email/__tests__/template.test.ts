import { describe, expect, it } from "vitest";

import { buildVisitorQrEmailTemplate } from "../template";

describe("buildVisitorQrEmailTemplate", () => {
  it("builds HTML with hosted QR image and text with only the safe public access link", () => {
    const result = buildVisitorQrEmailTemplate({
      visitorName: "Aung Kyaw",
      propertyName: "Victory Residence",
      unitLabel: "Tower A / Unit 12B",
      visitDateLabel: "2026-06-22",
      visitTimeLabel: "10:30 AM",
      hostName: "Daw Mya",
      hostRoleLabel: "Resident",
      hostPhone: "+95 9 123 456 789",
      qrAccessUrl: "https://visitor.example.com/qr-access/opaque-token",
      qrImageUrl: "https://visitor.example.com/api/v1/qr/email-image/opaque-token",
      supportContact: "Front Desk",
      propertyAddress: "No. 1 Victory Road, Yangon",
      notes: "Please show this QR code at the gate.",
    });

    expect(result.subject).toContain("Victory Residence");
    expect(result.subject).toContain("Aung Kyaw");
    expect(result.subject).not.toContain("opaque-token");
    expect(result.subject).not.toContain("raw-token-123");

    expect(result.html).toContain("Aung Kyaw");
    expect(result.html).toContain("Victory Residence");
    expect(result.html).toContain("Tower A / Unit 12B");
    expect(result.html).toContain("2026-06-22");
    expect(result.html).toContain("10:30 AM");
    expect(result.html).toContain("Daw Mya");
    expect(result.html).toContain("Resident");
    expect(result.html).toContain("+95 9 123 456 789");
    expect(result.html).toContain("https://visitor.example.com/qr-access/opaque-token");
    expect(result.html).toContain("https://visitor.example.com/api/v1/qr/email-image/opaque-token");
    expect(result.html).toContain("Please show this QR code at the gate.");
    expect(result.html).toContain("<img");
    expect(result.html).not.toContain("data:image/png");
    expect(result.html).not.toContain("raw-token-123");

    expect(result.text).toContain("Aung Kyaw");
    expect(result.text).toContain("Victory Residence");
    expect(result.text).toContain("Tower A / Unit 12B");
    expect(result.text).toContain("2026-06-22");
    expect(result.text).toContain("10:30 AM");
    expect(result.text).toContain("Daw Mya");
    expect(result.text).toContain("Resident");
    expect(result.text).toContain("https://visitor.example.com/qr-access/opaque-token");
    expect(result.text).toContain("Please show this QR code at the gate.");
    expect(result.text).not.toContain(
      "https://visitor.example.com/api/v1/qr/email-image/opaque-token",
    );
    expect(result.text).not.toContain("data:image/png");
    expect(result.text).not.toContain("raw-token-123");

    expect(result.qrDelivery).toEqual({
      hasInlineImage: true,
      hasAccessLink: true,
      accessUrl: "https://visitor.example.com/qr-access/opaque-token",
      imageUrl: "https://visitor.example.com/api/v1/qr/email-image/opaque-token",
    });
  });

  it("falls back to link-only QR delivery when no qr image url is provided", () => {
    const result = buildVisitorQrEmailTemplate({
      visitorName: "Guest User",
      propertyName: "Victory Residence",
      unitLabel: "Unit 9A",
      visitDateLabel: "2026-06-23",
      visitTimeLabel: "2:00 PM",
      hostName: "Ko Min",
      qrAccessUrl: "https://visitor.example.com/qr-access/link-only-token",
    });

    expect(result.html).not.toContain("<img");
    expect(result.html).toContain("https://visitor.example.com/qr-access/link-only-token");
    expect(result.text).toContain("Open your QR code");
    expect(result.text).toContain("https://visitor.example.com/qr-access/link-only-token");
    expect(result.text).not.toContain("QR image:");
    expect(result.qrDelivery).toEqual({
      hasInlineImage: false,
      hasAccessLink: true,
      accessUrl: "https://visitor.example.com/qr-access/link-only-token",
      imageUrl: undefined,
    });
  });

  it("rejects non-https qr image urls and keeps the email link-only", () => {
    const result = buildVisitorQrEmailTemplate({
      visitorName: "Guest User",
      propertyName: "Victory Residence",
      unitLabel: "Unit 9A",
      visitDateLabel: "2026-06-23",
      visitTimeLabel: "2:00 PM",
      hostName: "Ko Min",
      qrAccessUrl: "https://visitor.example.com/qr-access/link-only-token",
      qrImageUrl: "data:image/png;base64,abc123",
    });

    expect(result.html).not.toContain("<img");
    expect(result.html).not.toContain("data:image/png");
    expect(result.text).not.toContain("data:image/png");
    expect(result.qrDelivery).toEqual({
      hasInlineImage: false,
      hasAccessLink: true,
      accessUrl: "https://visitor.example.com/qr-access/link-only-token",
      imageUrl: undefined,
    });
  });

  it("escapes html-sensitive content in rendered output", () => {
    const result = buildVisitorQrEmailTemplate({
      visitorName: "<Visitor>",
      propertyName: "Victory & Sons",
      unitLabel: "Unit <12B>",
      visitDateLabel: "2026-06-24",
      visitTimeLabel: "9:00 AM",
      hostName: "Host <Admin>",
      qrAccessUrl: "https://visitor.example.com/qr-access/safe-token",
      notes: "Bring <ID> & register",
    });

    expect(result.html).toContain("&lt;Visitor&gt;");
    expect(result.html).toContain("Victory &amp; Sons");
    expect(result.html).toContain("Unit &lt;12B&gt;");
    expect(result.html).toContain("Host &lt;Admin&gt;");
    expect(result.html).toContain("Bring &lt;ID&gt; &amp; register");
  });
});
