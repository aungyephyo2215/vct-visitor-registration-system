"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CheckCircle, ShieldCheck, Camera, Car, FileText, LogOut } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const idTypes = [
  { value: "NRC", label: "NRC" },
  { value: "PASSPORT", label: "Passport" },
  { value: "DRIVING_LICENSE", label: "Driving License" },
  { value: "COMPANY_ID", label: "Company ID" },
  { value: "OTHER", label: "Other" },
];

interface VerificationData {
  id: string;
  visit_id: string;
  visitor_id: string | null;
  photo_url: string | null;
  vehicle_number: string | null;
  nda_signed: boolean;
  safety_form_signed: boolean;
  verified_by: string;
  verified_at: string;
}

interface VisitData {
  qr: { id: string; status: string; expires_at: string };
  visit: {
    id: string;
    status: string;
    unit: { unit_no: string; floor: number };
    host: { name: string } | null;
    visitor: { id: string; name: string; phone: string } | null;
    invitations: {
      id: string;
      visitor_name: string;
      visitor_phone: string;
      visitor_type: string;
      status: string;
    }[];
  };
}

export default function SecurityVerifyPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [visitData, setVisitData] = useState<VisitData | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);

  // Verification form
  const [visitorName, setVisitorName] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [visitorIdType, setVisitorIdType] = useState("");
  const [visitorIdNumber, setVisitorIdNumber] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [ndaSigned, setNdaSigned] = useState(false);
  const [safetySigned, setSafetySigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingVerification, setExistingVerification] = useState<VerificationData | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  async function handleLookup() {
    if (!token.trim()) {
      toast.error("QR token is required");
      return;
    }
    setSearching(true);
    setSearchDone(false);
    setVisitData(null);
    setExistingVerification(null);

    try {
      const data = await api.get<VisitData>("/api/v1/qr/lookup", { token: token.trim() });
      setVisitData(data);
      setSearchDone(true);

      // Pre-fill from invitation or existing visitor
      const inv = data.visit.invitations?.[0];
      if (inv) {
        setVisitorName(inv.visitor_name);
        setVisitorPhone(inv.visitor_phone);
      } else if (data.visit.visitor) {
        setVisitorName(data.visit.visitor.name);
        setVisitorPhone(data.visit.visitor.phone);
      }

      // Check if verification already exists
      try {
        const existing = await api.get<VerificationData>(`/api/v1/visits/${data.visit.id}/verification`);
        if (existing) {
          setExistingVerification(existing);
        }
      } catch {
        // no existing verification
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid QR code");
      setSearchDone(true);
    } finally {
      setSearching(false);
    }
  }

  async function handleVerify() {
    if (!visitorName || !visitorPhone) {
      toast.error("Visitor name and phone are required");
      return;
    }
    if (!visitData) return;

    // Validate photo size (max 1MB for base64)
    if (photoUrl && photoUrl.startsWith("data:")) {
      const sizeBytes = (photoUrl.length * 3) / 4;
      if (sizeBytes > 1024 * 1024) {
        toast.error("Photo exceeds 1MB limit. Please use a smaller image.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        visitor_name: visitorName.trim(),
        visitor_phone: visitorPhone.trim(),
        nda_signed: ndaSigned,
        safety_form_signed: safetySigned,
      };
      // Only include non-empty optional fields
      if (visitorIdType) payload.visitor_id_type = visitorIdType.toUpperCase();
      if (visitorIdNumber) payload.visitor_id_number = visitorIdNumber.trim();
      if (photoUrl) payload.photo_url = photoUrl;
      if (vehicleNumber) payload.vehicle_number = vehicleNumber.trim();

      const result = await api.post<VerificationData>(`/api/v1/visits/${visitData.visit.id}/verification`, payload);
      setExistingVerification(result);
      toast.success("Verification completed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      // Handle "already verified" gracefully — treat as success
      if (msg.includes("already verified")) {
        const existing = await api.get<VerificationData>(`/api/v1/visits/${visitData.visit.id}/verification`).catch(() => null);
        if (existing) setExistingVerification(existing);
        toast.success("Already verified");
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckin() {
    if (!visitData || !existingVerification) return;
    setCheckingIn(true);
    try {
      await api.post("/api/v1/checkin", { token: token.trim() });
      // Refresh visit data to get CHECKED_IN status
      const data = await api.get<VisitData>("/api/v1/qr/lookup", { token: token.trim() });
      setVisitData(data);
      toast.success("Check-in successful");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleCheckout() {
    if (!visitData) return;
    setCheckingOut(true);
    try {
      const result = await api.post("/api/v1/checkout/qr", { token: token.trim() });
      setVisitData((prev) => prev ? { ...prev, visit: { ...prev.visit, status: "CHECKED_OUT" } } : prev);
      toast.success("Check-out successful");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check-out failed");
    } finally {
      setCheckingOut(false);
    }
  }

  const isExpected = visitData?.visit.status === "EXPECTED";
  const notExpired = visitData && new Date(visitData.qr.expires_at) > new Date();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Security Verification</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Scan QR code to verify visitor identity
        </p>
      </div>

      {/* QR Token Input */}
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Scan QR Code</CardTitle>
          <CardDescription>Enter or scan the QR token from the visitor&apos;s badge</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste QR token or scan..."
              className="font-mono"
            />
            <Button onClick={handleLookup} disabled={searching}>
              <Search className="mr-2 h-4 w-4" />
              {searching ? "Searching..." : "Look Up"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Visit Info */}
      {visitData && (
        <Card>
          <CardHeader>
            <CardTitle>Visit Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Status</dt>
                <dd>
                  <Badge variant={isExpected && notExpired ? "default" : "secondary"}>
                    {visitData.visit.status}
                    {!notExpired ? " (Expired)" : ""}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Unit</dt>
                <dd className="font-medium">
                  Unit {visitData.visit.unit?.unit_no} (Floor {visitData.visit.unit?.floor})
                </dd>
              </div>
              {visitData.visit.host && (
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Host</dt>
                  <dd className="font-medium">{visitData.visit.host.name}</dd>
                </div>
              )}
              {visitData.visit.invitations?.[0] && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">Invited Visitor</dt>
                    <dd className="font-medium">{visitData.visit.invitations[0].visitor_name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">Visitor Type</dt>
                    <dd className="font-medium">{visitData.visit.invitations[0].visitor_type?.replace(/_/g, " ")}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">Invitation Status</dt>
                    <dd>
                      <Badge variant="outline">{visitData.visit.invitations[0].status}</Badge>
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Verification Form — only if not yet verified */}
      {visitData && !existingVerification && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Step 2: Verify Visitor
            </CardTitle>
            <CardDescription>Enter visitor information and verification details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Visitor Name *</Label>
                  <Input
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input
                    value={visitorPhone}
                    onChange={(e) => setVisitorPhone(e.target.value)}
                    placeholder="+959..."
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>ID Type</Label>
                  <Select value={visitorIdType} onValueChange={(v) => setVisitorIdType(v || "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {idTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ID Number</Label>
                  <Input
                    value={visitorIdNumber}
                    onChange={(e) => setVisitorIdNumber(e.target.value)}
                    placeholder="ID number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Photo (Base64 or URL)</Label>
                <Input
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="data:image/... or https://..."
                />
              </div>

              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="Vehicle number (optional)"
                  className="max-w-xs"
                />
              </div>

              <Separator />

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ndaSigned}
                    onChange={(e) => setNdaSigned(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">NDA Signed</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={safetySigned}
                    onChange={(e) => setSafetySigned(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Safety Form Signed</span>
                </label>
              </div>

              <Button onClick={handleVerify} disabled={submitting} className="w-full">
                {submitting ? "Submitting..." : "Complete Verification"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Already Verified — Check-in/Check-out */}
      {visitData && existingVerification && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              {visitData.visit.status === "CHECKED_OUT" ? "Checked Out" : visitData.visit.status === "CHECKED_IN" ? "Checked In" : "Verified"}
            </CardTitle>
            <CardDescription>
              {visitData.visit.status === "CHECKED_OUT" ? "Visit has been completed." : visitData.visit.status === "CHECKED_IN" ? "Visitor is checked in. Ready for checkout." : "Verification completed. Ready for check-in."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border p-4">
              <p className="text-sm font-medium">Visitor: {visitorName}</p>
              <p className="text-sm text-muted-foreground">
                NDA: {ndaSigned ? "Signed" : "Not signed"} | Safety: {safetySigned ? "Completed" : "Not completed"}
                {vehicleNumber ? ` | Vehicle: ${vehicleNumber}` : ""}
              </p>
            </div>

            <div className="flex gap-3">
              {isExpected && (
                <Button onClick={handleCheckin} disabled={checkingIn}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {checkingIn ? "Checking in..." : "Check In"}
                </Button>
              )}
              {visitData.visit.status === "CHECKED_IN" && (
                <Button onClick={handleCheckout} disabled={checkingOut} variant="outline">
                  <LogOut className="mr-2 h-4 w-4" />
                  {checkingOut ? "Checking out..." : "Check Out"}
                </Button>
              )}
              <Button variant="outline" onClick={() => router.push(`/visits/${visitData?.visit.id}`)}>
                View Visit Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {searchDone && !visitData && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No visit found for this QR token. Please check the token and try again.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
