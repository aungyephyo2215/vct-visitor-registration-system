"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Copy, QrCodeIcon, CheckCircle, LogOut, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface Visit {
  id: string;
  property_id: string;
  status: string;
  purpose: string;
  notes: string | null;
  vehicle_number: string | null;
  checkin_time: string | null;
  checkout_time: string | null;
  expected_checkin_time: string | null;
  created_at: string;
  visitor: { id: string; name: string; phone: string; id_type: string; id_number: string } | null;
  unit: { id: string; unit_no: string; floor: number };
  host: { id: string; name: string; email: string } | null;
  qrCodes?: { id: string; status: string; expires_at: string }[];
  verification?: {
    id: string;
    photo_url: string | null;
    vehicle_number: string | null;
    nda_signed: boolean;
    safety_form_signed: boolean;
    verified_at: string;
    verifier: { name: string };
  } | null;
}

export default function VisitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrToken, setQrToken] = useState("");
  const [qrExpires, setQrExpires] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [checkinToken, setCheckinToken] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<Visit>(`/api/v1/visits/${id}`);
        setVisit(data);
      } catch {
        toast.error("Visit not found");
        router.push("/visits");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  async function generateQR() {
    setGenerating(true);
    try {
      const result = await api.post<{ token: string; expires_at: string }>("/api/v1/qr/generate", {
        visit_id: id,
      });
      setQrToken(result.token);
      setQrExpires(result.expires_at);

      // Generate QR code image client-side
      try {
        const QRCodeMod = await import("qrcode");
        const qrDataUrl = await QRCodeMod.default.toDataURL(result.token, {
          width: 200,
          margin: 2,
          color: { dark: "#000", light: "#fff" },
        });
        setQrImage(qrDataUrl);
      } catch {
        // QR rendering fails, still show token
      }

      toast.success("QR code generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate QR");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCheckin() {
    if (!checkinToken) {
      toast.error("QR token is required");
      return;
    }
    setCheckingIn(true);
    try {
      const updated = await api.post<Visit>("/api/v1/checkin", {
        token: checkinToken,
      });
      setVisit(updated);
      setCheckinToken("");
      toast.success("Check-in successful");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleCheckout() {
    setCheckingOut(true);
    try {
      const updated = await api.post<Visit>("/api/v1/checkout", {
        visit_id: id,
      });
      setVisit(updated);
      setShowCheckout(false);
      toast.success("Check-out successful");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check-out failed");
    } finally {
      setCheckingOut(false);
    }
  }

  async function copyToken() {
    await navigator.clipboard.writeText(qrToken);
    toast.success("Token copied");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!visit) return null;

  const isCheckedIn = visit.status === "CHECKED_IN";
  const isCheckedOut = visit.status === "CHECKED_OUT";
  const isExpected = visit.status === "EXPECTED";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/visits">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Visit Details</h1>
            <StatusBadge status={visit.status} />
          </div>
          <p className="text-muted-foreground">
            Created {new Date(visit.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Visit Info */}
        <Card>
          <CardHeader>
            <CardTitle>Visit Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-muted-foreground text-sm">Purpose</dt>
                <dd className="font-medium">{visit.purpose.replace(/_/g, " ")}</dd>
              </div>
              {visit.notes && (
                <div>
                  <dt className="text-muted-foreground text-sm">Notes</dt>
                  <dd className="font-medium">{visit.notes}</dd>
                </div>
              )}
              {visit.vehicle_number && (
                <div>
                  <dt className="text-muted-foreground text-sm">Vehicle</dt>
                  <dd className="font-medium">{visit.vehicle_number}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground text-sm">Unit</dt>
                <dd className="font-medium">
                  Unit {visit.unit?.unit_no} (Floor {visit.unit?.floor})
                </dd>
              </div>
              {visit.host && (
                <div>
                  <dt className="text-muted-foreground text-sm">Host</dt>
                  <dd className="font-medium">{visit.host.name}</dd>
                </div>
              )}
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-muted-foreground text-sm">Check In</dt>
                  <dd className="font-medium">
                    {visit.checkin_time ? new Date(visit.checkin_time).toLocaleString() : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-sm">Check Out</dt>
                  <dd className="font-medium">
                    {visit.checkout_time ? new Date(visit.checkout_time).toLocaleString() : "—"}
                  </dd>
                </div>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Visitor Info */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Link href={`/visitors/${visit.visitor?.id}`} className="hover:underline">
                Visitor
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-muted-foreground text-sm">Name</dt>
                <dd className="font-medium">{visit.visitor?.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-sm">Phone</dt>
                <dd className="font-medium">{visit.visitor?.phone}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-sm">ID</dt>
                <dd className="font-medium">
                  {visit.visitor?.id_type?.replace(/_/g, " ")} / {visit.visitor?.id_number}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* QR and Check-in/out */}
      <Card>
        <CardHeader>
          <CardTitle>Check-In / Check-Out</CardTitle>
          <CardDescription>Manage the visit lifecycle</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Generate QR */}
          {isExpected && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Button onClick={generateQR} disabled={generating}>
                  <QrCodeIcon className="mr-2 h-4 w-4" />
                  {generating ? "Generating..." : "Generate QR Code"}
                </Button>
              </div>

              {qrToken && (
                <div className="space-y-4 rounded-lg border p-4">
                  <div className="flex items-center justify-center">
                    {qrImage ? (
                      <img src={qrImage} alt="QR Code" className="h-48 w-48" />
                    ) : (
                      <div className="bg-muted flex h-48 w-48 items-center justify-center rounded-lg">
                        <QrCodeIcon className="text-muted-foreground h-12 w-12" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>QR Token</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={qrToken} className="font-mono text-xs" />
                      <Button variant="outline" size="icon" onClick={copyToken}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Expires: {new Date(qrExpires).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Manual Check-in by Token */}
          {isExpected && (
            <div className="space-y-3">
              <Label>Manual Check-In (QR Token)</Label>
              <div className="flex gap-2">
                <Input
                  value={checkinToken}
                  onChange={(e) => setCheckinToken(e.target.value)}
                  placeholder="Paste QR token..."
                  disabled={checkingIn}
                  className="font-mono"
                />
                <Button onClick={handleCheckin} disabled={checkingIn || !checkinToken}>
                  {checkingIn ? (
                    "Checking in..."
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Check In
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Check Out */}
          {isCheckedIn && (
            <div>
              <Button variant="outline" onClick={() => setShowCheckout(true)}>
                <LogOut className="mr-2 h-4 w-4" />
                Check Out
              </Button>
            </div>
          )}

          {/* Status timeline */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">Status Timeline</Label>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1">
                <div
                  className={`h-2 w-2 rounded-full ${
                    visit.created_at ? "bg-green-500" : "bg-muted"
                  }`}
                />
                <span className={visit.created_at ? "" : "text-muted-foreground"}>Created</span>
              </div>
              <div className="bg-muted h-px flex-1" />
              <div className="flex items-center gap-1">
                <div
                  className={`h-2 w-2 rounded-full ${
                    isCheckedIn || isCheckedOut ? "bg-green-500" : "bg-muted"
                  }`}
                />
                <span className={isCheckedIn || isCheckedOut ? "" : "text-muted-foreground"}>
                  Checked In
                </span>
              </div>
              <div className="bg-muted h-px flex-1" />
              <div className="flex items-center gap-1">
                <div
                  className={`h-2 w-2 rounded-full ${isCheckedOut ? "bg-green-500" : "bg-muted"}`}
                />
                <span className={isCheckedOut ? "" : "text-muted-foreground"}>Checked Out</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          {visit.verification ? (
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-muted-foreground text-sm">Verified By</dt>
                <dd className="font-medium">{visit.verification.verifier?.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground text-sm">Verified At</dt>
                <dd className="font-medium">
                  {new Date(visit.verification.verified_at).toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground text-sm">NDA</dt>
                <dd>
                  <Badge variant={visit.verification.nda_signed ? "default" : "secondary"}>
                    {visit.verification.nda_signed ? "Signed" : "Not signed"}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground text-sm">Safety Form</dt>
                <dd>
                  <Badge variant={visit.verification.safety_form_signed ? "default" : "secondary"}>
                    {visit.verification.safety_form_signed ? "Completed" : "Not completed"}
                  </Badge>
                </dd>
              </div>
              {visit.verification.vehicle_number && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground text-sm">Vehicle</dt>
                  <dd className="font-medium">{visit.verification.vehicle_number}</dd>
                </div>
              )}
              {visit.verification.photo_url && (
                <div>
                  <dt className="text-muted-foreground text-sm">Photo</dt>
                  <dd>
                    <img
                      src={visit.verification.photo_url}
                      alt="Visitor"
                      className="mt-1 h-20 w-20 rounded-md object-cover"
                    />
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <div>
              <p className="text-muted-foreground mb-3 text-sm">Not yet verified</p>
              <Link href={`/security/verify`}>
                <Button variant="outline" size="sm">
                  Verify Visitor
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showCheckout}
        onOpenChange={setShowCheckout}
        title="Check Out"
        description="Confirm check-out for this visitor?"
        confirmLabel="Check Out"
        onConfirm={handleCheckout}
      />
    </div>
  );
}
