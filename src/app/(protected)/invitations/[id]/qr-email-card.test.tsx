import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InvitationQrEmailCard } from "./qr-email-card";

describe("InvitationQrEmailCard", () => {
  it("renders QR email status and resend button when an active QR exists", () => {
    const html = renderToStaticMarkup(
      <InvitationQrEmailCard
        canGenerateQr
        canResendQrEmail
        cooldownRemainingSeconds={0}
        generatingQr={false}
        hasActiveQr
        isApproved
        qrCodeExpiresAt="2026-06-23T10:30:00.000Z"
        qrEmailDelivery={{
          deliveryId: "delivery-1",
          status: "SENT",
          provider: "smtp",
          triggerType: "AUTO",
          failureCode: null,
          sentAt: "2026-06-22T10:31:00.000Z",
          createdAt: "2026-06-22T10:31:00.000Z",
        }}
        resendLoading={false}
        onGenerateQr={() => {}}
        onResendQrEmail={() => {}}
        visitId="visit-1"
      />,
    );

    expect(html).toContain("QR Email Delivery");
    expect(html).toContain("Sent");
    expect(html).toContain("Resend QR Email");
    expect(html).toContain("View Visit");
    expect(html).toContain("QR is active");
    expect(html).not.toContain("provider_message_id");
    expect(html).not.toContain("email_access_token");
  });

  it("renders cooldown guidance and disables resend during cooldown", () => {
    const html = renderToStaticMarkup(
      <InvitationQrEmailCard
        canGenerateQr
        canResendQrEmail
        cooldownRemainingSeconds={120}
        generatingQr={false}
        hasActiveQr
        isApproved
        qrCodeExpiresAt="2026-06-23T10:30:00.000Z"
        qrEmailDelivery={{
          deliveryId: "delivery-2",
          status: "SKIPPED",
          provider: "none",
          triggerType: "MANUAL_RESEND",
          failureCode: "QR_EMAIL_DISABLED",
          sentAt: null,
          createdAt: "2026-06-22T10:00:00.000Z",
        }}
        resendLoading={false}
        onGenerateQr={() => {}}
        onResendQrEmail={() => {}}
        visitId="visit-1"
      />,
    );

    expect(html).toContain("Skipped");
    expect(html).toContain("Try again in 120 seconds");
    expect(html).toContain("disabled");
  });

  it("hides resend button when there is no active generated QR", () => {
    const html = renderToStaticMarkup(
      <InvitationQrEmailCard
        canGenerateQr
        canResendQrEmail={false}
        cooldownRemainingSeconds={0}
        generatingQr={false}
        hasActiveQr={false}
        isApproved
        qrCodeExpiresAt={null}
        qrEmailDelivery={null}
        resendLoading={false}
        onGenerateQr={() => {}}
        onResendQrEmail={() => {}}
        visitId={null}
      />,
    );

    expect(html).toContain("Generate QR Code");
    expect(html).not.toContain("Resend QR Email");
    expect(html).toContain("No QR email has been sent yet");
  });
});
