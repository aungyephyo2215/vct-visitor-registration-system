"use client";

import { useState, useCallback } from "react";
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
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { QrScanner } from "@/components/qr-scanner";
import { toast } from "sonner";

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

type ScanStep = "scan" | "result";

export default function ScannerPage() {
  const router = useRouter();
  const [manualToken, setManualToken] = useState("");
  const [visitData, setVisitData] = useState<VisitData | null>(null);
  const [searching, setSearching] = useState(false);
  const [step, setStep] = useState<ScanStep>("scan");
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [scannerPaused, setScannerPaused] = useState(false);

  const handleLookup = useCallback(async (token: string) => {
    if (!token.trim()) return;

    setSearching(true);
    setVisitData(null);

    try {
      const data = await api.get<VisitData>("/api/v1/qr/lookup", {
        token: token.trim(),
      });
      setVisitData(data);
      setStep("result");
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

  const handleCheckIn = async () => {
    if (!visitData) return;
    setCheckingIn(true);
    try {
      await api.post("/api/v1/checkin", { token: manualToken });
      toast.success("Visitor checked in");
      // Refresh data
      const updated = await api.get<VisitData>("/api/v1/qr/lookup", {
        token: manualToken,
      });
      setVisitData(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!visitData) return;
    setCheckingOut(true);
    try {
      await api.post("/api/v1/checkout/qr", { token: manualToken });
      toast.success("Visitor checked out");
      const updated = await api.get<VisitData>("/api/v1/qr/lookup", {
        token: manualToken,
      });
      setVisitData(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check-out failed");
    } finally {
      setCheckingOut(false);
    }
  };

  const handleReset = () => {
    setStep("scan");
    setVisitData(null);
    setManualToken("");
    setScannerPaused(false);
  };

  const handleGoToVerify = () => {
    if (visitData) {
      router.push(`/security/verify`);
    }
  };

  const isExpired = visitData ? new Date(visitData.qr.expires_at) < new Date() : false;
  const isQrActive = visitData?.qr.status === "ACTIVE" && !isExpired;
  const isVerified = !!visitData?.visit.visitor;
  const isCheckedIn = visitData?.visit.status === "CHECKED_IN";
  const isCheckedOut = visitData?.visit.status === "CHECKED_OUT";
  const isCancelled = visitData?.visit.status === "CANCELLED";

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
    if (isVerified)
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

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-20">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">QR Scanner</h1>
        <p className="text-muted-foreground">Scan a visitor QR code to verify and check in</p>
      </div>

      {/* Step 1: Scanner */}
      {step === "scan" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
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

      {/* Step 2: Result */}
      {step === "result" && visitData && (
        <div className="space-y-4">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Visit Status
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
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {!isVerified && !isCheckedIn && !isCheckedOut && !isCancelled && (
                  <Button onClick={handleGoToVerify} className="w-full" size="lg">
                    <UserCheck className="mr-2 h-5 w-5" />
                    Verify Visitor
                  </Button>
                )}

                {isVerified && !isCheckedIn && !isCheckedOut && !isCancelled && isQrActive && (
                  <Button
                    onClick={handleCheckIn}
                    disabled={checkingIn}
                    className="w-full"
                    size="lg"
                  >
                    {checkingIn ? (
                      "Checking in..."
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-5 w-5" />
                        Check In Visitor
                      </>
                    )}
                  </Button>
                )}

                {isCheckedIn && (
                  <Button
                    onClick={handleCheckOut}
                    disabled={checkingOut}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    {checkingOut ? (
                      "Checking out..."
                    ) : (
                      <>
                        <LogOut className="mr-2 h-5 w-5" />
                        Check Out Visitor
                      </>
                    )}
                  </Button>
                )}

                <Button onClick={handleGoToVerify} variant="outline" className="w-full">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Full Verification Page
                </Button>

                <Button onClick={handleReset} variant="ghost" className="w-full">
                  <QrCode className="mr-2 h-4 w-4" />
                  Scan Another QR Code
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
