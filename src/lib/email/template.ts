export interface VisitorQrEmailTemplateInput {
  visitorName: string;
  propertyName: string;
  unitLabel: string;
  visitDateLabel: string;
  visitTimeLabel: string;
  hostName: string;
  hostRoleLabel?: string;
  hostPhone?: string;
  propertyAddress?: string;
  qrAccessUrl: string;
  qrImageUrl?: string;
  supportContact?: string;
  notes?: string;
}

export interface VisitorQrEmailTemplateOutput {
  subject: string;
  html: string;
  text: string;
  qrDelivery: {
    hasInlineImage: boolean;
    hasAccessLink: boolean;
    accessUrl: string;
    imageUrl?: string;
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderOptionalLine(label: string, value?: string): string {
  if (!value) return "";
  return `<p style="margin:4px 0;"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`;
}

function isHostedHttpsUrl(value?: string): value is string {
  return Boolean(value && value.startsWith("https://"));
}

export function buildVisitorQrEmailTemplate(
  input: VisitorQrEmailTemplateInput,
): VisitorQrEmailTemplateOutput {
  const subject = `Your visitor QR code for ${input.propertyName} — ${input.visitorName}`;
  const safeNotes = input.notes ? escapeHtml(input.notes) : undefined;
  const safeQrImageUrl = isHostedHttpsUrl(input.qrImageUrl) ? input.qrImageUrl : undefined;
  const qrImageBlock = safeQrImageUrl
    ? `<div style="margin:20px 0;text-align:center;">
        <img
          src="${escapeHtml(safeQrImageUrl)}"
          alt="QR code for ${escapeHtml(input.visitorName)}"
          style="max-width:280px;width:100%;height:auto;border:1px solid #d1d5db;border-radius:12px;padding:12px;background:#ffffff;"
        />
      </div>`
    : "";

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6;max-width:640px;margin:0 auto;">
      <h1 style="font-size:24px;margin-bottom:12px;">Visitor QR Code Ready</h1>
      <p>Hello ${escapeHtml(input.visitorName)},</p>
      <p>Your visitor access QR code for <strong>${escapeHtml(input.propertyName)}</strong> is ready.</p>

      <div style="margin:20px 0;padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;">
        <p style="margin:4px 0;"><strong>Property:</strong> ${escapeHtml(input.propertyName)}</p>
        <p style="margin:4px 0;"><strong>Unit:</strong> ${escapeHtml(input.unitLabel)}</p>
        ${renderOptionalLine("Address", input.propertyAddress)}
        <p style="margin:4px 0;"><strong>Visit date:</strong> ${escapeHtml(input.visitDateLabel)}</p>
        <p style="margin:4px 0;"><strong>Visit time:</strong> ${escapeHtml(input.visitTimeLabel)}</p>
        <p style="margin:4px 0;"><strong>Host / Resident:</strong> ${escapeHtml(input.hostName)}</p>
        ${renderOptionalLine("Host role", input.hostRoleLabel)}
        ${renderOptionalLine("Host phone", input.hostPhone)}
      </div>

      ${qrImageBlock}

      <p>
        <a href="${escapeHtml(input.qrAccessUrl)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;">
          Open your QR code
        </a>
      </p>

      <p>If the QR image does not display in your email app, use this direct link:</p>
      <p><a href="${escapeHtml(input.qrAccessUrl)}">${escapeHtml(input.qrAccessUrl)}</a></p>

      ${safeNotes ? `<p><strong>Notes:</strong> ${safeNotes}</p>` : ""}
      ${input.supportContact ? `<p><strong>Support:</strong> ${escapeHtml(input.supportContact)}</p>` : ""}

      <p>Please present this QR code at the gate or reception during check-in.</p>
    </div>
  `.trim();

  const text = [
    "Visitor QR Code Ready",
    "",
    `Hello ${input.visitorName},`,
    "",
    `Your visitor access QR code for ${input.propertyName} is ready.`,
    "",
    `Property: ${input.propertyName}`,
    `Unit: ${input.unitLabel}`,
    input.propertyAddress ? `Address: ${input.propertyAddress}` : "",
    `Visit date: ${input.visitDateLabel}`,
    `Visit time: ${input.visitTimeLabel}`,
    `Host / Resident: ${input.hostName}`,
    input.hostRoleLabel ? `Host role: ${input.hostRoleLabel}` : "",
    input.hostPhone ? `Host phone: ${input.hostPhone}` : "",
    "",
    "Open your QR code:",
    input.qrAccessUrl,
    input.notes ? `Notes: ${input.notes}` : "",
    input.supportContact ? `Support: ${input.supportContact}` : "",
    "",
    "Please present this QR code at the gate or reception during check-in.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject,
    html,
    text,
    qrDelivery: {
      hasInlineImage: Boolean(safeQrImageUrl),
      hasAccessLink: true,
      accessUrl: input.qrAccessUrl,
      imageUrl: safeQrImageUrl,
    },
  };
}
