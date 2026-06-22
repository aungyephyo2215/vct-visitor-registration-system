import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetEmailProvider,
  mockBuildVisitorQrEmailTemplate,
  mockInvitationFindFirst,
  mockQRCodeFindFirst,
  mockQrEmailDeliveryFindUnique,
  mockQrEmailDeliveryCreate,
  mockQrEmailDeliveryUpdate,
  mockQrEmailDeliveryUpdateMany,
} = vi.hoisted(() => ({
  mockGetEmailProvider: vi.fn(),
  mockBuildVisitorQrEmailTemplate: vi.fn(),
  mockInvitationFindFirst: vi.fn(),
  mockQRCodeFindFirst: vi.fn(),
  mockQrEmailDeliveryFindUnique: vi.fn(),
  mockQrEmailDeliveryCreate: vi.fn(),
  mockQrEmailDeliveryUpdate: vi.fn(),
  mockQrEmailDeliveryUpdateMany: vi.fn(),
}));

vi.mock("../provider", () => ({
  getEmailProvider: mockGetEmailProvider,
}));

vi.mock("../template", () => ({
  buildVisitorQrEmailTemplate: mockBuildVisitorQrEmailTemplate,
}));

import { sendInvitationQrEmail } from "../qr-delivery";

const mockPrisma = {
  invitation: {
    findFirst: mockInvitationFindFirst,
  },
  qRCode: {
    findFirst: mockQRCodeFindFirst,
  },
  qrEmailDelivery: {
    findUnique: mockQrEmailDeliveryFindUnique,
    create: mockQrEmailDeliveryCreate,
    update: mockQrEmailDeliveryUpdate,
    updateMany: mockQrEmailDeliveryUpdateMany,
  },
} as unknown as import("@/generated/prisma/client").PrismaClient;

function buildInvitation(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv-1",
    property_id: "prop-1",
    invited_by: "user-1",
    visitor_name: "Aung Kyaw",
    visitor_email: "aung@example.com",
    expected_date: new Date("2026-06-22T00:00:00.000Z"),
    expected_time: "10:30 AM",
    notes: "Please show this QR code at the gate.",
    visit_id: "visit-1",
    property: {
      id: "prop-1",
      name: "Victory Residence",
      address: "No. 1 Victory Road, Yangon",
    },
    unit: {
      id: "unit-1",
      unit_no: "12B",
      floor: 12,
    },
    inviter: {
      id: "user-1",
      name: "Daw Mya",
      email: "daw.mya@example.com",
    },
    visit: {
      id: "visit-1",
      host: {
        id: "user-1",
        name: "Daw Mya",
        email: "daw.mya@example.com",
      },
    },
    ...overrides,
  };
}

function buildQrCode(overrides: Record<string, unknown> = {}) {
  return {
    id: "qr-1",
    property_id: "prop-1",
    visit_id: "visit-1",
    expires_at: new Date("2026-06-23T10:30:00.000Z"),
    ...overrides,
  };
}

function buildDelivery(overrides: Record<string, unknown> = {}) {
  return {
    id: "delivery-1",
    recipient_email: "aung@example.com",
    provider: "mock",
    provider_message_id: null,
    failure_code: null,
    failure_message: null,
    sent_at: null,
    status: "PENDING",
    trigger_type: "AUTO",
    email_access_token: "opaque-token",
    expires_at: new Date("2026-06-23T10:30:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.APP_BASE_URL = "https://visitor.example.com";
  process.env.QR_EMAIL_ENABLED = "true";

  mockInvitationFindFirst.mockResolvedValue(buildInvitation());
  mockQRCodeFindFirst.mockResolvedValue(buildQrCode());
  mockQrEmailDeliveryFindUnique.mockResolvedValue(null);
  mockQrEmailDeliveryCreate.mockResolvedValue(buildDelivery());
  mockQrEmailDeliveryUpdate.mockResolvedValue(
    buildDelivery({
      status: "SENT",
      provider_message_id: "msg-1",
      sent_at: new Date("2026-06-21T16:10:00.000Z"),
    }),
  );
  mockQrEmailDeliveryUpdateMany.mockResolvedValue({ count: 1 });
  mockBuildVisitorQrEmailTemplate.mockReturnValue({
    subject: "Your visitor QR code",
    html: "<p>QR ready</p>",
    text: "QR ready",
    qrDelivery: {
      hasInlineImage: true,
      hasAccessLink: true,
      accessUrl: "https://visitor.example.com/qr-access/opaque-token",
      imageUrl: "https://visitor.example.com/api/v1/qr/email-image/opaque-token",
    },
  });
  mockGetEmailProvider.mockReturnValue({
    name: "mock",
    send: vi.fn().mockResolvedValue({
      success: true,
      provider: "mock",
      messageId: "msg-1",
    }),
  });
});

describe("sendInvitationQrEmail", () => {
  it("claims an AUTO delivery row before sending and finalizes it as SENT", async () => {
    const providerSend = vi.fn().mockResolvedValue({
      success: true,
      provider: "mock",
      messageId: "provider-msg-1",
    });
    mockGetEmailProvider.mockReturnValue({
      name: "mock",
      send: providerSend,
    });
    mockQrEmailDeliveryCreate.mockResolvedValue(buildDelivery({ id: "delivery-pending" }));
    mockQrEmailDeliveryUpdate.mockResolvedValue(
      buildDelivery({
        id: "delivery-pending",
        status: "SENT",
        provider_message_id: "provider-msg-1",
        sent_at: new Date("2026-06-21T16:12:00.000Z"),
      }),
    );

    const result = await sendInvitationQrEmail(mockPrisma, {
      invitationId: "inv-1",
      qrCodeId: "qr-1",
      rawToken: "token-123",
    });

    expect(mockQrEmailDeliveryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PENDING",
          idempotency_key: "AUTO:qr-1",
          email_access_token: expect.any(String),
          expires_at: new Date("2026-06-23T10:30:00.000Z"),
        }),
      }),
    );
    expect(mockBuildVisitorQrEmailTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        qrImageUrl: expect.stringMatching(
          /^https:\/\/visitor\.example\.com\/api\/v1\/qr\/email-image\//,
        ),
        qrAccessUrl: expect.stringMatching(/^https:\/\/visitor\.example\.com\/qr-access\//),
      }),
    );
    const templateCall = mockBuildVisitorQrEmailTemplate.mock.calls[0][0];
    expect(templateCall.qrAccessUrl).not.toContain("token-123");
    expect(templateCall.qrImageUrl).not.toContain("token-123");

    expect(providerSend).toHaveBeenCalledTimes(1);
    expect(mockQrEmailDeliveryUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "delivery-pending" },
        data: expect.objectContaining({
          status: "SENT",
          provider: "mock",
          provider_message_id: "provider-msg-1",
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "SENT",
      attempted: true,
      provider: "mock",
      deliveryId: "delivery-pending",
    });
  });

  it("returns existing delivery without sending again when AUTO already has SENT record", async () => {
    mockQrEmailDeliveryFindUnique.mockResolvedValue(
      buildDelivery({
        id: "delivery-existing",
        status: "SENT",
        provider: "smtp",
        provider_message_id: "provider-msg-existing",
        sent_at: new Date("2026-06-21T16:12:00.000Z"),
      }),
    );

    const result = await sendInvitationQrEmail(mockPrisma, {
      invitationId: "inv-1",
      qrCodeId: "qr-1",
      rawToken: "token-123",
    });

    expect(result).toMatchObject({
      status: "SKIPPED",
      attempted: false,
      provider: "smtp",
      deliveryId: "delivery-existing",
      providerMessageId: "provider-msg-existing",
    });
    expect(mockQrEmailDeliveryCreate).not.toHaveBeenCalled();
    expect(mockGetEmailProvider).not.toHaveBeenCalled();
    expect(mockBuildVisitorQrEmailTemplate).not.toHaveBeenCalled();
  });

  it("retries by reclaiming an existing AUTO FAILED row instead of creating a new one", async () => {
    const providerSend = vi.fn().mockResolvedValue({
      success: true,
      provider: "mock",
      messageId: "provider-msg-2",
    });
    mockGetEmailProvider.mockReturnValue({
      name: "mock",
      send: providerSend,
    });
    mockQrEmailDeliveryFindUnique.mockResolvedValue(
      buildDelivery({
        id: "delivery-failed",
        status: "FAILED",
        provider: "smtp",
        failure_code: "SMTP_TIMEOUT",
        failure_message: "Timed out before",
      }),
    );
    mockQrEmailDeliveryUpdate.mockResolvedValueOnce(
      buildDelivery({
        id: "delivery-failed",
        status: "SENT",
        provider: "mock",
        provider_message_id: "provider-msg-2",
        sent_at: new Date("2026-06-21T16:15:00.000Z"),
      }),
    );

    const result = await sendInvitationQrEmail(mockPrisma, {
      invitationId: "inv-1",
      qrCodeId: "qr-1",
      rawToken: "token-123",
    });

    expect(mockQrEmailDeliveryUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "delivery-failed", status: { in: ["FAILED", "SKIPPED"] } },
        data: expect.objectContaining({
          status: "PENDING",
          provider: "pending",
          provider_message_id: null,
          failure_code: null,
          failure_message: null,
        }),
      }),
    );
    expect(mockQrEmailDeliveryCreate).not.toHaveBeenCalled();
    expect(providerSend).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      status: "SENT",
      attempted: true,
      deliveryId: "delivery-failed",
    });
  });

  it("retries by reclaiming an existing AUTO SKIPPED row instead of creating a new one", async () => {
    mockQrEmailDeliveryFindUnique.mockResolvedValue(
      buildDelivery({
        id: "delivery-skipped",
        status: "SKIPPED",
        provider: "none",
        failure_code: "MISSING_RECIPIENT_EMAIL",
        failure_message: "Invitation has no visitor email",
      }),
    );
    mockInvitationFindFirst.mockResolvedValue(buildInvitation({ visitor_email: null }));
    mockQrEmailDeliveryUpdate.mockResolvedValue(
      buildDelivery({
        id: "delivery-skipped",
        status: "SKIPPED",
        provider: "none",
        recipient_email: "",
        failure_code: "MISSING_RECIPIENT_EMAIL",
        failure_message: "Invitation has no visitor email",
      }),
    );

    const result = await sendInvitationQrEmail(mockPrisma, {
      invitationId: "inv-1",
      qrCodeId: "qr-1",
      rawToken: "token-123",
    });

    expect(mockQrEmailDeliveryUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "delivery-skipped", status: { in: ["FAILED", "SKIPPED"] } },
        data: expect.objectContaining({ status: "PENDING" }),
      }),
    );
    expect(mockGetEmailProvider).not.toHaveBeenCalled();
    expect(mockQrEmailDeliveryUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "delivery-skipped" },
        data: expect.objectContaining({
          status: "SKIPPED",
          provider: "none",
          failure_code: "MISSING_RECIPIENT_EMAIL",
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "SKIPPED",
      attempted: false,
      deliveryId: "delivery-skipped",
      failureCode: "MISSING_RECIPIENT_EMAIL",
    });
  });

  it("handles AUTO claim unique constraint collision gracefully and does not send duplicate email", async () => {
    const providerSend = vi.fn();
    mockGetEmailProvider.mockReturnValue({
      name: "mock",
      send: providerSend,
    });
    mockQrEmailDeliveryCreate.mockRejectedValueOnce({
      code: "P2002",
      name: "PrismaClientKnownRequestError",
    });
    mockQrEmailDeliveryFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(
      buildDelivery({
        id: "delivery-race",
        status: "PENDING",
        provider: "pending",
      }),
    );

    const result = await sendInvitationQrEmail(mockPrisma, {
      invitationId: "inv-1",
      qrCodeId: "qr-1",
      rawToken: "token-123",
    });

    expect(providerSend).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "SKIPPED",
      attempted: false,
      deliveryId: "delivery-race",
      provider: "pending",
      failureCode: "AUTO_SEND_IN_PROGRESS",
    });
  });

  it("does not call provider.send when another AUTO call already holds a PENDING claim", async () => {
    const providerSend = vi.fn();
    mockGetEmailProvider.mockReturnValue({
      name: "mock",
      send: providerSend,
    });
    mockQrEmailDeliveryFindUnique.mockResolvedValue(
      buildDelivery({
        id: "delivery-pending",
        status: "PENDING",
        provider: "pending",
      }),
    );

    const result = await sendInvitationQrEmail(mockPrisma, {
      invitationId: "inv-1",
      qrCodeId: "qr-1",
      rawToken: "token-123",
    });

    expect(providerSend).not.toHaveBeenCalled();
    expect(mockQrEmailDeliveryCreate).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "SKIPPED",
      attempted: false,
      deliveryId: "delivery-pending",
      provider: "pending",
      failureCode: "AUTO_SEND_IN_PROGRESS",
    });
  });

  it("records FAILED by updating the claimed row when the provider reports a send failure", async () => {
    const providerSend = vi.fn().mockResolvedValue({
      success: false,
      provider: "smtp",
      errorCode: "SMTP_TIMEOUT",
      errorMessage: "Timed out while sending token-123",
    });
    mockGetEmailProvider.mockReturnValue({
      name: "smtp",
      send: providerSend,
    });
    mockQrEmailDeliveryCreate.mockResolvedValue(buildDelivery({ id: "delivery-failed" }));
    mockQrEmailDeliveryUpdate.mockResolvedValue(
      buildDelivery({
        id: "delivery-failed",
        status: "FAILED",
        provider: "smtp",
        failure_code: "SMTP_TIMEOUT",
        failure_message: "Timed out while sending [REDACTED]",
      }),
    );

    const result = await sendInvitationQrEmail(mockPrisma, {
      invitationId: "inv-1",
      qrCodeId: "qr-1",
      rawToken: "token-123",
    });

    expect(result).toMatchObject({
      status: "FAILED",
      attempted: true,
      failureMessage: "Timed out while sending [REDACTED]",
    });
    expect(mockQrEmailDeliveryUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "delivery-failed" },
        data: expect.objectContaining({
          status: "FAILED",
          provider: "smtp",
          failure_code: "SMTP_TIMEOUT",
          failure_message: "Timed out while sending [REDACTED]",
        }),
      }),
    );
  });
});
