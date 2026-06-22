import { notFound } from "next/navigation";

import { resolvePublicQrAccessByToken } from "@/lib/email/public-qr-access";
import { prisma } from "@/lib/prisma";

export default async function PublicQrAccessPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const access = await resolvePublicQrAccessByToken(prisma, token);

  if (!access) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-2xl rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <p className="text-sm font-medium tracking-[0.2em] text-slate-500 uppercase">
            Visitor QR Access
          </p>
          <h1 className="mt-2 text-3xl font-bold">{access.visitorName}</h1>
          <p className="mt-2 text-sm text-slate-600">
            Present this QR code at the gate or reception during check-in.
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border bg-slate-50 p-5">
          <img
            src={access.qrImageUrl}
            alt={`QR code for ${access.visitorName}`}
            className="mx-auto h-72 w-72 max-w-full rounded-xl border bg-white p-3"
          />
        </div>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border p-4">
            <dt className="text-sm text-slate-500">Property</dt>
            <dd className="mt-1 font-semibold">{access.propertyName}</dd>
          </div>
          <div className="rounded-xl border p-4">
            <dt className="text-sm text-slate-500">Unit</dt>
            <dd className="mt-1 font-semibold">{access.unitLabel}</dd>
          </div>
          <div className="rounded-xl border p-4">
            <dt className="text-sm text-slate-500">Visit date</dt>
            <dd className="mt-1 font-semibold">{access.visitDateLabel}</dd>
          </div>
          <div className="rounded-xl border p-4">
            <dt className="text-sm text-slate-500">Visit time</dt>
            <dd className="mt-1 font-semibold">{access.visitTimeLabel}</dd>
          </div>
          <div className="rounded-xl border p-4 sm:col-span-2">
            <dt className="text-sm text-slate-500">Host / Resident</dt>
            <dd className="mt-1 font-semibold">{access.hostName}</dd>
          </div>
          {access.propertyAddress ? (
            <div className="rounded-xl border p-4 sm:col-span-2">
              <dt className="text-sm text-slate-500">Address</dt>
              <dd className="mt-1 font-semibold">{access.propertyAddress}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </main>
  );
}
