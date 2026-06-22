"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Printer, ShieldCheck, XCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

import { InvitationQrEmailCard, type SafeQrEmailDelivery } from "./qr-email-card";

interface Invitation {
  id: string;
  property_id: string;
  visitor_name: string;
  visitor_phone: string;
  visitor_email: string | null;
  visitor_id_type: string | null;
  visitor_id_number: string | null;
  visitor_type: string;
  expected_date: string;
  expected_time: string | null;
  notes: string | null;
  status: string;
  reason: string | null;
  visit_id: string | null;
  created_at: string;
  inviter: { id: string; name: string; email: string };
  approver: { id: string; name: string } | null;
  unit: { id: string; unit_no: string; floor: number };
  qrCode: {
    hasActive: boolean;
    expiresAt: string | null;
  };
  qrEmailDelivery: SafeQrEmailDelivery | null;
}

interface Approval {
  id: string;
  status: string;
  note: string | null;
  created_at: string;
  approver: { name: string };
}

interface Badge {
  id: string;
  badge_type: string;
  generated_at: string;
  printed_at: string | null;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
  EXPIRED: "secondary",
  CANCELLED: "outline",
};

export default function InvitationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldownRemainingSeconds, setCooldownRemainingSeconds] = useState(0);

  const [generatingBadge, setGeneratingBadge] = useState(false);

  const isApproved = invitation?.status === "APPROVED";
  const isPending = invitation?.status === "PENDING";
  const hasActiveQr = invitation?.qrCode?.hasActive === true;
  const canApprove =
    isPending && user && ["SUPER_ADMIN", "PROPERTY_ADMIN", "OFFICE_STAFF"].includes(user.role);
  const canGenerateQr =
    isApproved &&
    user &&
    ["SUPER_ADMIN", "PROPERTY_ADMIN", "OFFICE_STAFF", "SECURITY_GUARD"].includes(user.role);
  const canResendQrEmail = Boolean(
    hasActiveQr &&
    user &&
    ["SUPER_ADMIN", "PROPERTY_ADMIN", "OFFICE_STAFF", "SECURITY_GUARD"].includes(user.role),
  );

  async function loadInvitationDetails() {
    const invData = await api.get<Invitation>(`/api/v1/invitations/${id}`);
    setInvitation(invData);
    return invData;
  }

  async function loadApprovals() {
    const appData = await api.get<Approval[]>(`/api/v1/invitations/${id}/approvals`);
    setApprovals(appData);
  }

  async function loadBadgesIfApproved(invitationData: Invitation) {
    if (invitationData.status !== "APPROVED") {
      setBadges([]);
      return;
    }

    try {
      const badgesData = await api.get<Badge[]>(`/api/v1/badges?invitation_id=${id}`);
      setBadges(Array.isArray(badgesData) ? badgesData : []);
    } catch {
      setBadges([]);
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const [invData] = await Promise.all([loadInvitationDetails(), loadApprovals()]);
        await loadBadgesIfApproved(invData);
      } catch {
        toast.error("Invitation not found");
        router.push("/invitations");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  useEffect(() => {
    if (cooldownRemainingSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldownRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownRemainingSeconds]);

  async function handleApprove() {
    setActionLoading(true);
    try {
      await api.post<Invitation>(`/api/v1/invitations/${id}/approve`, {});
      const updatedInvitation = await loadInvitationDetails();
      await Promise.all([loadApprovals(), loadBadgesIfApproved(updatedInvitation)]);
      toast.success("Invitation approved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast.error("Reason is required");
      return;
    }
    setActionLoading(true);
    try {
      await api.post<Invitation>(`/api/v1/invitations/${id}/reject`, {
        reason: rejectReason,
      });
      await Promise.all([loadInvitationDetails(), loadApprovals()]);
      setShowReject(false);
      setRejectReason("");
      toast.success("Invitation rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleGenerateQR() {
    setGeneratingQr(true);
    try {
      const result = await api.post<{
        expires_at: string;
        visit_id: string;
        qr_code_id: string;
        emailDelivery?: {
          status: "SENT" | "FAILED" | "SKIPPED";
          provider: string;
          deliveryId: string | null;
          skippedReason?: string;
          failureCode?: string;
        };
      }>(`/api/v1/invitations/${id}/generate-qr`, {});

      await loadInvitationDetails();

      if (result.emailDelivery?.status === "SENT") {
        toast.success("QR code generated and QR email sent");
      } else if (result.emailDelivery?.status === "SKIPPED") {
        toast.success(
          `QR code generated. QR email skipped${result.emailDelivery.skippedReason ? `: ${result.emailDelivery.skippedReason}` : ""}`,
        );
      } else if (result.emailDelivery?.status === "FAILED") {
        toast.error(
          `QR code generated, but email delivery failed${result.emailDelivery.failureCode ? `: ${result.emailDelivery.failureCode}` : ""}`,
        );
      } else {
        toast.success("QR code generated");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate QR");
    } finally {
      setGeneratingQr(false);
    }
  }

  async function handleResendQrEmail() {
    setResendLoading(true);
    try {
      const result = await api.post<{
        emailDelivery: {
          status: "SENT" | "FAILED" | "SKIPPED";
          provider: string;
          deliveryId: string | null;
          skippedReason?: string;
          failureCode?: string;
        };
      }>(`/api/v1/invitations/${id}/resend-qr-email`, {});

      await loadInvitationDetails();

      if (result.emailDelivery.status === "SENT") {
        toast.success("QR email sent successfully");
      } else if (result.emailDelivery.status === "SKIPPED") {
        toast.success(
          `QR email resend skipped${result.emailDelivery.skippedReason ? `: ${result.emailDelivery.skippedReason}` : ""}`,
        );
      } else {
        toast.error(
          `QR email resend failed${result.emailDelivery.failureCode ? `: ${result.emailDelivery.failureCode}` : ""}`,
        );
      }
    } catch (err) {
      const apiError = err as Error & {
        status?: number;
        details?: { retryAfterSeconds?: number; cooldownSeconds?: number };
      };

      if (apiError.status === 429 && apiError.details?.retryAfterSeconds) {
        setCooldownRemainingSeconds(apiError.details.retryAfterSeconds);
        toast.error(
          `QR email resend is on cooldown. Try again in ${apiError.details.retryAfterSeconds} seconds.`,
        );
      } else {
        toast.error(apiError.message || "Failed to resend QR email");
      }
    } finally {
      setResendLoading(false);
    }
  }

  async function handleGenerateBadge() {
    setGeneratingBadge(true);
    try {
      const badge = await api.post<{ id: string }>("/api/v1/badges", {
        invitation_id: id,
      });
      setBadges((prev) => [
        ...prev,
        {
          id: badge.id,
          badge_type: invitation?.visitor_type || "",
          generated_at: new Date().toISOString(),
          printed_at: null,
        },
      ]);
      toast.success("Badge generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate badge");
    } finally {
      setGeneratingBadge(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full max-w-lg" />
      </div>
    );
  }

  if (!invitation) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/invitations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{invitation.visitor_name}</h1>
            <Badge variant={statusVariant[invitation.status] || "outline"}>
              {invitation.status?.replace(/_/g, " ")}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {invitation.visitor_type?.replace(/_/g, " ")} visit
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Visitor Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-muted-foreground text-sm">Name</dt>
                <dd className="font-medium">{invitation.visitor_name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-sm">Phone</dt>
                <dd className="font-medium">{invitation.visitor_phone}</dd>
              </div>
              {invitation.visitor_email && (
                <div>
                  <dt className="text-muted-foreground text-sm">Email</dt>
                  <dd className="font-medium">{invitation.visitor_email}</dd>
                </div>
              )}
              {invitation.visitor_id_type && (
                <div>
                  <dt className="text-muted-foreground text-sm">ID</dt>
                  <dd className="font-medium">
                    {invitation.visitor_id_type?.replace(/_/g, " ")} /{" "}
                    {invitation.visitor_id_number}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground text-sm">Type</dt>
                <dd className="font-medium">{invitation.visitor_type?.replace(/_/g, " ")}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visit Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-muted-foreground text-sm">Unit</dt>
                <dd className="font-medium">
                  Unit {invitation.unit?.unit_no} (Floor {invitation.unit?.floor})
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-sm">Expected Date</dt>
                <dd className="font-medium">
                  {new Date(invitation.expected_date).toLocaleDateString()}
                  {invitation.expected_time ? ` at ${invitation.expected_time}` : ""}
                </dd>
              </div>
              {invitation.notes && (
                <div>
                  <dt className="text-muted-foreground text-sm">Notes</dt>
                  <dd className="font-medium">{invitation.notes}</dd>
                </div>
              )}
              <Separator />
              <div>
                <dt className="text-muted-foreground text-sm">Invited By</dt>
                <dd className="font-medium">{invitation.inviter?.name}</dd>
              </div>
              {invitation.approver && (
                <div>
                  <dt className="text-muted-foreground text-sm">
                    {invitation.status === "APPROVED" ? "Approved By" : "Reviewed By"}
                  </dt>
                  <dd className="font-medium">{invitation.approver.name}</dd>
                </div>
              )}
              {invitation.reason && (
                <div>
                  <dt className="text-muted-foreground text-sm">Reason</dt>
                  <dd className="font-medium">{invitation.reason}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      <InvitationQrEmailCard
        isApproved={Boolean(isApproved)}
        canGenerateQr={Boolean(canGenerateQr)}
        hasActiveQr={hasActiveQr}
        visitId={invitation.visit_id}
        qrCodeExpiresAt={invitation.qrCode?.expiresAt ?? null}
        qrEmailDelivery={invitation.qrEmailDelivery}
        generatingQr={generatingQr}
        resendLoading={resendLoading}
        canResendQrEmail={canResendQrEmail}
        cooldownRemainingSeconds={cooldownRemainingSeconds}
        onGenerateQr={handleGenerateQR}
        onResendQrEmail={handleResendQrEmail}
      />

      {/* Badge Section — only for APPROVED */}
      {isApproved && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Visitor Badge
            </CardTitle>
            <CardDescription>Generate and print visitor badge</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleGenerateBadge} disabled={generatingBadge} variant="outline">
              {generatingBadge ? "Generating..." : "Generate Badge"}
            </Button>

            {badges.length > 0 && (
              <div className="space-y-3">
                {badges.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        Badge — {b.badge_type?.replace(/_/g, " ")}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Generated: {new Date(b.generated_at).toLocaleString()}
                      </p>
                    </div>
                    <Link href={`/api/v1/badges/${b.id}/print`} target="_blank">
                      <Button variant="outline" size="sm">
                        <Printer className="mr-2 h-3 w-3" />
                        Print
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Approval History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Approval History
          </CardTitle>
          <CardDescription>Record of all approval actions</CardDescription>
        </CardHeader>
        <CardContent>
          {approvals.length === 0 ? (
            <p className="text-muted-foreground text-sm">No approval actions yet.</p>
          ) : (
            <div className="space-y-3">
              {approvals.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{a.approver.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(a.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      a.status === "APPROVED"
                        ? "default"
                        : a.status === "REJECTED"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {a.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve / Reject Actions */}
      {canApprove && (
        <Card>
          <CardHeader>
            <CardTitle>Review Invitation</CardTitle>
            <CardDescription>Approve or reject this invitation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button onClick={handleApprove} disabled={actionLoading}>
                <CheckCircle className="mr-2 h-4 w-4" />
                {actionLoading ? "Processing..." : "Approve"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowReject(true)}
                disabled={actionLoading}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </div>

            {showReject && (
              <div className="space-y-3 rounded-lg border p-4">
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for rejection *</Label>
                  <Textarea
                    id="reason"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Required reason..."
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowReject(false);
                      setRejectReason("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleReject}
                    disabled={actionLoading || !rejectReason.trim()}
                  >
                    {actionLoading ? "Rejecting..." : "Confirm Reject"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <div
                className={`h-2 w-2 rounded-full ${invitation.created_at ? "bg-green-500" : "bg-muted"}`}
              />
              <span className={invitation.created_at ? "" : "text-muted-foreground"}>Created</span>
            </div>
            <div className="bg-muted h-px flex-1" />
            <div className="flex items-center gap-1">
              <div
                className={`h-2 w-2 rounded-full ${["APPROVED", "REJECTED"].includes(invitation.status) ? (invitation.status === "APPROVED" ? "bg-green-500" : "bg-destructive") : "bg-muted"}`}
              />
              <span
                className={
                  ["APPROVED", "REJECTED"].includes(invitation.status)
                    ? ""
                    : "text-muted-foreground"
                }
              >
                {invitation.status === "REJECTED" ? "Rejected" : "Reviewed"}
              </span>
            </div>
            <div className="bg-muted h-px flex-1" />
            <div className="flex items-center gap-1">
              <div
                className={`h-2 w-2 rounded-full ${invitation.visit_id ? "bg-green-500" : "bg-muted"}`}
              />
              <span className={invitation.visit_id ? "" : "text-muted-foreground"}>
                QR Generated
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
