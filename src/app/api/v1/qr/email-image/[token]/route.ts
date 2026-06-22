import QRCode from "qrcode";

import { errorResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { resolvePublicQrAccessByToken } from "@/lib/email/public-qr-access";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const access = await resolvePublicQrAccessByToken(prisma, token);

  if (!access) {
    return errorResponse("QR image not found", 404);
  }

  const image = await QRCode.toBuffer(access.qrPayloadUrl, {
    type: "png",
    width: 320,
    margin: 2,
  });

  const imageBytes = Uint8Array.from(image);

  return new Response(imageBytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": "image/png",
      "cache-control": "private, no-store",
    },
  });
}
