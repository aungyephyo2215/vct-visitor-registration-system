"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  QrCode,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  LogOut,
  AlertTriangle,
  ExternalLink,
  Camera,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { QrScanner } from "@/components/qr-scanner";
import { toast } from "sonner";

const ID_TYPES = [
  { value: "NRC", label: "NRC" },
  { value: "PASSPORT", label: "Passport" },
  { value: "DRIVING_LICENSE", label: "Driving License" },
  { value: "COMPANY_ID", label: "Company ID" },
  { value: "OTHER", label: "Other" },
];

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

interface VerificationData {
  id: string;
  visit_id: string;
  visitor_id: string | null;
  photo_url: string | null;
  vehicle_number: string | null;
  nda_signed: boolean;
  safety_form_signed: boolean;
}

type ScannerStep = "scan" | "result" | "verify" | "success";

export default function ScannerPage() {
  const router = useRouter();
  const [manualToken, setManualToken] = useState("");
  const [visitData, setVisitData] = useState<VisitData | null>(null);
  const [existingVerification, setExistingVerification] = useState<VerificationData | null>(null);
  const [searching, setSearching] = useState(false);
  const [step, setStep] = useState<ScannerStep>("scan");
  const [scannerPaused, setScannerPaused] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Verification form state
  const [visitorName, setVisitorName] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [visitorIdType, setVisitorIdType] = useState("");
  const [visitorIdNumber, setVisitorIdNumber] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [ndaSigned, setNdaSigned] = useState(false);
  const [safetySigned, setSafetySigned] = useState(false);

  // Derived state
  const visitStatus = visitData?.visit.status;
  const isExpired = visitData ? new Date(visitData.qr.expires_at) < new Date() : false;
  const isQrActive = visitData?.qr.status === "ACTIVE" && !isExpired;
  const hasVisitor = !!visitData?.visit.visitor;
  const hasVerification = !!existingVerification;
  const isExpected = visitStatus === "EXPECTED";
  const isCheckedIn = visitStatus === "CHECKED_IN";
  const isCheckedOut = visitStatus === "CHECKED_OUT";
  const isCancelled = visitStatus === "CANCELLED";

  // What is the next action?
  const needsVerification = isExpected && !hasVerification;
  const needsCheckIn = isExpected && hasVerification && hasVisitor;
  const needsCheckOut = isCheckedIn;

  // ─── QR Scan & Lookup ─────────────────────────────────

  const handleLookup = useCallback(async (token: string) => {
    if (!token.trim()) return;

    setSearching(true);
    setVisitData(null);
    setExistingVerification(null);

    try {
      const data = await api.get<VisitData>("/api/v1/qr/lookup", {
        token: token.trim(),
      });
      setVisitData(data);
      setStep("result");

      // Pre-fill verification form from invitation
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
        const existing = await api.get<VerificationData>(
          `/api/v1/visits/${data.visit.id}/verification`,
        );
        if (existing) {
          setExistingVerification(existing);
        }
      } catch {
        // no existing verification
      }

      setScannerPaused(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid QR code");
    } finally {
      setSearching(false);
    }
  }, []);

  const handleScanResult = useCallback(
    (token: string) => {
      setManualToken(token);
      handleLookup(token);
    },
    [handleLookup],
  );

  const handleManualLookup = () => {
    handleLookup(manualToken);
  };

  // ─── Verification ─────────────────────────────────────

  const handleStartVerify = () => {
    setStep("verify");
  };

  const handleCancelVerify = () => {
    setStep("result");
  };

  const handleCompleteVerification = async () => {
    if (!visitData) return;
    if (!visitorName || !visitorPhone) {
      toast.error("Visitor name and phone are required");
      return;
    }

    // Validate photo size
    if (photoUrl && photoUrl.startsWith("data:")) {
      const sizeBytes = (photoUrl.length * 3) / 4;
      if (sizeBytes > 1024 * 1024) {
        toast.error("Photo exceeds 1MB limit");
        return;
      }
    }

    setActionLoading(true);
    try {
      const payload: Record<string, unknown> = {
        visitor_name: visitorName.trim(),
        visitor_phone: visitorPhone.trim(),
        nda_signed: ndaSigned,
        safety_form_signed: safetySigned,
      };
      if (visitorIdType) payload.visitor_id_type = visitorIdType.toUpperCase();
      if (visitorIdNumber) payload.visitor_id_number = visitorIdNumber.trim();
      if (photoUrl) payload.photo_url = photoUrl;
      if (vehicleNumber) payload.vehicle_number = vehicleNumber.trim();

      const verification = await api.post<VerificationData>(
        `/api/v1/visits/${visitData.visit.id}/verification`,
        payload,
      );

      setExistingVerification(verification);
      toast.success("Visitor verified");

      // Auto proceed to check-in
      await handleCheckIn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Check-In ─────────────────────────────────────────

  const handleCheckIn = async (skipVerification = false) => {
    if (!visitData) return;

    if (!skipVerification && !existingVerification) {
      toast.error("Verification required before check-in");
      return;
    }

    setActionLoading(true);
    try {
      await api.post("/api/v1/checkin", { token: manualToken });

      // Refresh visit data
      const updated = await api.get<VisitData>("/api/v1/qr/lookup", {
        token: manualToken,
      });
      setVisitData(updated);

      setSuccessMessage(
        `${updated.visit.visitor?.name || "Visitor"} checked in successfully. Host notified.`,
      );
      setStep("success");
      startAutoReturn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Check-Out ────────────────────────────────────────

  const handleCheckOut = async () => {
    if (!visitData) return;

    setActionLoading(true);
    try {
      await api.post("/api/v1/checkout/qr", { token: manualToken });

      // Refresh visit data
      const updated = await api.get<VisitData>("/api/v1/qr/lookup", {
        token: manualToken,
      });
      setVisitData(updated);

      setSuccessMessage(`${updated.visit.visitor?.name || "Visitor"} checked out successfully.`);
      setStep("success");
      startAutoReturn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check-out failed");
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Navigation ───────────────────────────────────────

  const startAutoReturn = () => {
    if (countdownRef.current) clearTimeout(countdownRef.current);
    countdownRef.current = setTimeout(() => {
      handleReset();
    }, 3000);
  };

  const handleReturnNow = () => {
    if (countdownRef.current) clearTimeout(countdownRef.current);
    handleReset();
  };

  const handleReset = () => {
    setStep("scan");
    setVisitData(null);
    setExistingVerification(null);
    setManualToken("");
    setScannerPaused(false);
    setSuccessMessage("");
    setActionLoading(false);
    // Reset verification form
    setVisitorName("");
    setVisitorPhone("");
    setVisitorIdType("");
    setVisitorIdNumber("");
    setPhotoUrl("");
    setVehicleNumber("");
    setNdaSigned(false);
    setSafetySigned(false);
  };

  const handleViewDetails = () => {
    if (visitData) {
      router.push(`/security/verify?token=${encodeURIComponent(manualToken)}`);
    }
  };

  // ─── Status Badge ─────────────────────────────────────

  const getStatusBadge = () => {
    if (!visitData) return null;
    if (isExpired)
      return (
        <Badge variant="destructive">
          <Clock className="mr-1 h-3 w-3" />
          Expired
        </Badge>
      );
    if (isCheckedOut)
      return (
        <Badge variant="secondary">
          <LogOut className="mr-1 h-3 w-3" />
          Checked Out
        </Badge>
      );
    if (isCheckedIn)
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle className="mr-1 h-3 w-3" />
          Checked In
        </Badge>
      );
    if (hasVerification)
      return (
        <Badge variant="default">
          <UserCheck className="mr-1 h-3 w-3" />
          Verified
        </Badge>
      );
    if (isCancelled)
      return (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" />
          Cancelled
        </Badge>
      );
    return (
      <Badge variant="outline">
        <Clock className="mr-1 h-3 w-3" />
        Expected
      </Badge>
    );
  };

  // ─── Primary Action Button ────────────────────────────

  const getPrimaryAction = () => {
    if (!visitData || isExpired || isCancelled) return null;

    // CHECKED_OUT → read-only completed state
    if (isCheckedOut) {
      return (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
          <CheckCircle className="mx-auto mb-2 h-8 w-8 text-gray-400" />
          <p className="font-medium text-gray-600">Visit completed</p>
          <p className="text-sm text-gray-500">
            {visitData.visit.visitor?.name || "Visitor"} checked out
          </p>
        </div>
      );
    }

    // CHECKED_IN → Check Out
    if (needsCheckOut) {
      return (
        <Button
          onClick={handleCheckOut}
          disabled={actionLoading}
          className="w-full"
          size="lg"
          variant="outline"
        >
          {actionLoading ? (
            "Processing..."
          ) : (
            <>
              <LogOut className="mr-2 h-5 w-5" />
              Check Out {visitData.visit.visitor?.name || "Visitor"}
            </>
          )}
        </Button>
      );
    }

    // EXPECTED + no verification → Verify Visitor
    if (needsVerification) {
      return (
        <Button onClick={handleStartVerify} className="w-full" size="lg">
          <UserCheck className="mr-2 h-5 w-5" />
          Verify Visitor
        </Button>
      );
    }

    // EXPECTED + verified → Check In
    if (needsCheckIn) {
      return (
        <Button
          onClick={() => handleCheckIn(false)}
          disabled={actionLoading}
          className="w-full"
          size="lg"
        >
          {actionLoading ? (
            "Checking in..."
          ) : (
            <>
              <CheckCircle className="mr-2 h-5 w-5" />
              Check In {visitData.visit.visitor?.name || "Visitor"}
            </>
          )}
        </Button>
      );
    }

    return null;
  };

  // ─── Render ───────────────────────────────────────────

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-20">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Security Gate</h1>
        <p className="text-muted-foreground">
          Scan QR code to verify, check in, or check out visitors
        </p>
      </div>

      {/* ─── Step 1: Scanner ─────────────────────────── */}
      {step === "scan" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Scan QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <QrScanner onScanResult={handleScanResult} paused={scannerPaused} />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background text-muted-foreground px-2">Or enter manually</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Paste QR token here"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualLookup()}
              />
              <Button onClick={handleManualLookup} disabled={searching || !manualToken.trim()}>
                {searching ? "Looking up..." : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Step 2: Visitor Found ───────────────────── */}
      {step === "result" && visitData && (
        <div className="space-y-4">
          {/* Visitor Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Visitor Found
                </CardTitle>
                {getStatusBadge()}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {visitData.visit.invitations?.[0] && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Visitor</span>
                  <span className="font-medium">{visitData.visit.invitations[0].visitor_name}</span>
                </div>
              )}
              {visitData.visit.visitor && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Registered</span>
                  <span className="font-medium">{visitData.visit.visitor.name}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Unit</span>
                <span className="font-medium">
                  {visitData.visit.unit.unit_no} (Floor {visitData.visit.unit.floor})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Host</span>
                <span className="font-medium">{visitData.visit.host?.name || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">QR Status</span>
                <span className="font-medium">{visitData.qr.status}</span>
              </div>
              {isExpired && (
                <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-md px-3 py-2 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  QR code has expired. A new QR code must be generated.
                </div>
              )}
              {isCheckedOut && (
                <div className="bg-muted text-muted-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  This visit has been completed.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Primary Action */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {getPrimaryAction()}

                {/* Secondary: View Full Details */}
                <Button onClick={handleViewDetails} variant="outline" className="w-full">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Full Details
                </Button>

                {/* Reset */}
                <Button onClick={handleReset} variant="ghost" className="w-full">
                  <QrCode className="mr-2 h-4 w-4" />
                  Scan Another QR Code
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Step 3: Inline Verification Panel ───────── */}
      {step === "verify" && visitData && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Verify Visitor Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="visitorName">Visitor Name *</Label>
                <Input
                  id="visitorName"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="Full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="visitorPhone">Phone Number *</Label>
                <Input
                  id="visitorPhone"
                  value={visitorPhone}
                  onChange={(e) => setVisitorPhone(e.target.value)}
                  placeholder="+959..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="idType">ID Type</Label>
                  <Select value={visitorIdType} onValueChange={(v) => setVisitorIdType(v ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select ID type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ID_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="idNumber">ID Number</Label>
                  <Input
                    id="idNumber"
                    value={visitorIdNumber}
                    onChange={(e) => setVisitorIdNumber(e.target.value)}
                    placeholder="ID number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                <Input
                  id="vehicleNumber"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g. ABC-1234"
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={ndaSigned}
                    onChange={(e) => setNdaSigned(e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm">NDA Signed</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={safetySigned}
                    onChange={(e) => setSafetySigned(e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm">Safety Form Signed</span>
                </label>
              </div>

              <Separator />

              <div className="flex gap-3">
                <Button
                  onClick={handleCompleteVerification}
                  disabled={actionLoading}
                  className="flex-1"
                  size="lg"
                >
                  {actionLoading ? (
                    "Processing..."
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Verify & Check In
                    </>
                  )}
                </Button>
                <Button onClick={handleCancelVerify} variant="outline" size="lg">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Step 4: Success ─────────────────────────── */}
      {step === "success" && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
              <div>
                <p className="text-lg font-medium text-green-800">{successMessage}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Returning to scanner in 3 seconds...
                </p>
              </div>
              <Button onClick={handleReturnNow} variant="outline">
                Return to Scanner Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
