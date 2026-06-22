import Link from "next/link";
import { Mail, QrCodeIcon, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SafeQrEmailDelivery = {
  deliveryId: string;
  status: "PENDING" | "SENT" | "FAILED" | "SKIPPED";
  provider: string;
  triggerType: "AUTO" | "MANUAL_RESEND";
  failureCode: string | null;
  sentAt: string | null;
  createdAt: string;
};

type InvitationQrEmailCardProps = {
  isApproved: boolean;
  canGenerateQr: boolean;
  hasActiveQr: boolean;
  visitId: string | null;
  qrCodeExpiresAt: string | null;
  qrEmailDelivery: SafeQrEmailDelivery | null;
  generatingQr: boolean;
  resendLoading: boolean;
  canResendQrEmail: boolean;
  cooldownRemainingSeconds: number;
  onGenerateQr: () => void;
  onResendQrEmail: () => void;
};

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function getStatusVariant(status: SafeQrEmailDelivery["status"] | null) {
  if (status === "SENT") return "default" as const;
  if (status === "FAILED") return "destructive" as const;
  if (status === "SKIPPED") return "secondary" as const;
  return "outline" as const;
}

function getStatusLabel(status: SafeQrEmailDelivery["status"] | null) {
  if (status === "SENT") return "Sent";
  if (status === "FAILED") return "Failed";
  if (status === "SKIPPED") return "Skipped";
  if (status === "PENDING") return "Pending";
  return "Not sent";
}

function getStatusDescription(delivery: SafeQrEmailDelivery | null) {
  if (!delivery) {
    return "No QR email has been sent yet.";
  }

  if (delivery.status === "SENT") {
    return `Last sent ${formatDateTime(delivery.sentAt || delivery.createdAt)} via ${delivery.provider}.`;
  }

  if (delivery.status === "FAILED") {
    return delivery.failureCode
      ? `Last send failed with ${delivery.failureCode}.`
      : "Last send failed.";
  }

  if (delivery.status === "SKIPPED") {
    return delivery.failureCode
      ? `Last send was skipped with ${delivery.failureCode}.`
      : "Last send was skipped.";
  }

  return "QR email delivery is in progress.";
}

export type { SafeQrEmailDelivery, InvitationQrEmailCardProps };

export function InvitationQrEmailCard({
  isApproved,
  canGenerateQr,
  hasActiveQr,
  visitId,
  qrCodeExpiresAt,
  qrEmailDelivery,
  generatingQr,
  resendLoading,
  canResendQrEmail,
  cooldownRemainingSeconds,
  onGenerateQr,
  onResendQrEmail,
}: InvitationQrEmailCardProps) {
  if (!isApproved) return null;

  const resendDisabled = resendLoading || cooldownRemainingSeconds > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCodeIcon className="h-5 w-5" />
          QR Email Delivery
        </CardTitle>
        <CardDescription>
          Generate a QR for this invitation and resend the hosted QR email when needed.
        </CardDescription>
        {hasActiveQr && canResendQrEmail ? (
          <CardAction>
            <Button variant="outline" size="sm" onClick={onResendQrEmail} disabled={resendDisabled}>
              <RefreshCw className="mr-2 h-3 w-3" />
              {resendLoading ? "Resending..." : "Resend QR Email"}
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasActiveQr ? (
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium">No active QR code is available yet.</p>
            <p className="text-muted-foreground text-sm">No QR email has been sent yet.</p>
            <p className="text-muted-foreground text-sm">
              Generate the invitation QR code before sending or resending QR email delivery.
            </p>
            {canGenerateQr ? (
              <Button onClick={onGenerateQr} disabled={generatingQr}>
                {generatingQr ? "Generating..." : "Generate QR Code"}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">QR is active</Badge>
              <Badge variant={getStatusVariant(qrEmailDelivery?.status ?? null)}>
                {getStatusLabel(qrEmailDelivery?.status ?? null)}
              </Badge>
            </div>
            <p className="text-sm">{getStatusDescription(qrEmailDelivery)}</p>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">QR expires</dt>
                <dd className="font-medium">{formatDateTime(qrCodeExpiresAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last delivery attempt</dt>
                <dd className="font-medium">
                  {formatDateTime(qrEmailDelivery?.sentAt || qrEmailDelivery?.createdAt || null)}
                </dd>
              </div>
            </dl>
            {cooldownRemainingSeconds > 0 ? (
              <p className="text-muted-foreground text-sm">
                Try again in {cooldownRemainingSeconds} seconds.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {visitId ? (
                <Link href={`/visits/${visitId}`}>
                  <Button variant="outline" size="sm">
                    View Visit
                  </Button>
                </Link>
              ) : null}
              {canResendQrEmail ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onResendQrEmail}
                  disabled={resendDisabled}
                >
                  <Mail className="mr-2 h-3 w-3" />
                  {resendLoading ? "Resending..." : "Resend QR Email"}
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
