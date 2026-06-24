"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QrCode, Search, CheckCircle, LogOut, UserCheck, ExternalLink, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { QrScanner } from "@/components/qr-scanner";
import { VisitInfoCard } from "@/components/security/visit-info-card";
import { VerificationForm } from "@/components/security/verification-form";
import { useSecurityWorkflow } from "@/hooks/use-security-workflow";
import type { ScannerStep } from "@/types/security-workflow";
import type { VerificationFormData } from "@/components/security/verification-form";
import { toast } from "sonner";

export default function ScannerPage() {
  const router = useRouter();
  const [manualToken, setManualToken] = useState("");
  const [step, setStep] = useState<ScannerStep>("scan");
  const [scannerPaused, setScannerPaused] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const workflow = useSecurityWorkflow({
    token: manualToken,
  });

  // Cleanup countdown timer on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
  }, []);

  // ─── QR Scan & Lookup ─────────────────────────────────

  const handleScanResult = useCallback(
    async (token: string) => {
      setManualToken(token);
      setScannerPaused(true);
      await workflow.lookup();
      if (workflow.visitData) {
        setStep("result");
      }
    },
    [workflow],
  );

  const handleManualLookup = async () => {
    if (!manualToken.trim()) return;
    await workflow.lookup();
    if (workflow.visitData) {
      setStep("result");
      setScannerPaused(true);
    }
  };

  // ─── Verification ─────────────────────────────────────

  const handleStartVerify = () => {
    setStep("verify");
  };

  const handleCancelVerify = () => {
    setStep("result");
  };

  const handleCompleteVerification = async (data: VerificationFormData) => {
    const verification = await workflow.verify(data);
    if (verification) {
      toast.success("Visitor verified");
      // Auto proceed to check-in
      await handleCheckIn();
    }
  };

  // ─── Check-In ─────────────────────────────────────────

  const handleCheckIn = async () => {
    const success = await workflow.checkIn();
    if (success) {
      const name = workflow.visitData?.visit.visitor?.name || "Visitor";
      setSuccessMessage(`${name} checked in successfully. Host notified.`);
      setStep("success");
      startAutoReturn();
    }
  };

  // ─── Check-Out ────────────────────────────────────────

  const handleCheckOut = async () => {
    const success = await workflow.checkOut();
    if (success) {
      const name = workflow.visitData?.visit.visitor?.name || "Visitor";
      setSuccessMessage(`${name} checked out successfully.`);
      setStep("success");
      startAutoReturn();
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
    setManualToken("");
    setScannerPaused(false);
    setSuccessMessage("");
    workflow.reset();
  };

  const handleViewDetails = () => {
    if (manualToken) {
      router.push(`/security/verify?token=${encodeURIComponent(manualToken)}`);
    }
  };

  // ─── Primary Action ───────────────────────────────────

  const getPrimaryAction = () => {
    if (!workflow.visitData || workflow.isExpired || workflow.isCancelled) return null;

    if (workflow.isCheckedOut) {
      return (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
          <CheckCircle className="mx-auto mb-2 h-8 w-8 text-gray-400" />
          <p className="font-medium text-gray-600">Visit completed</p>
          <p className="text-sm text-gray-500">
            {workflow.visitData.visit.visitor?.name || "Visitor"} checked out
          </p>
        </div>
      );
    }

    if (workflow.needsCheckOut) {
      return (
        <Button
          onClick={handleCheckOut}
          disabled={workflow.loading}
          className="w-full"
          size="lg"
          variant="outline"
        >
          {workflow.loading ? (
            "Processing..."
          ) : (
            <>
              <LogOut className="mr-2 h-5 w-5" />
              Check Out {workflow.visitData.visit.visitor?.name || "Visitor"}
            </>
          )}
        </Button>
      );
    }

    if (workflow.needsVerification) {
      return (
        <Button onClick={handleStartVerify} className="w-full" size="lg">
          <UserCheck className="mr-2 h-5 w-5" />
          Verify Visitor
        </Button>
      );
    }

    if (workflow.needsCheckIn) {
      return (
        <Button onClick={handleCheckIn} disabled={workflow.loading} className="w-full" size="lg">
          {workflow.loading ? (
            "Checking in..."
          ) : (
            <>
              <CheckCircle className="mr-2 h-5 w-5" />
              Check In {workflow.visitData.visit.visitor?.name || "Visitor"}
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
              <Button
                onClick={handleManualLookup}
                disabled={workflow.loading || !manualToken.trim()}
              >
                {workflow.loading ? "Looking up..." : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Step 2: Visitor Found ───────────────────── */}
      {step === "result" && workflow.visitData && (
        <div className="space-y-4">
          <VisitInfoCard
            visitData={workflow.visitData}
            hasVerification={workflow.hasVerification}
          />

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {getPrimaryAction()}

                <Button onClick={handleViewDetails} variant="outline" className="w-full">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Full Details
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

      {/* ─── Step 3: Inline Verification ─────────────── */}
      {step === "verify" && workflow.visitData && (
        <VerificationForm
          initialName={
            workflow.visitData.visit.invitations?.[0]?.visitor_name ||
            workflow.visitData.visit.visitor?.name ||
            ""
          }
          initialPhone={
            workflow.visitData.visit.invitations?.[0]?.visitor_phone ||
            workflow.visitData.visit.visitor?.phone ||
            ""
          }
          loading={workflow.loading}
          onSubmit={handleCompleteVerification}
          onCancel={handleCancelVerify}
          submitLabel="Verify & Check In"
        />
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

      {/* ─── Error Display ───────────────────────────── */}
      {workflow.error && step !== "scan" && (
        <div className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          {workflow.error}
        </div>
      )}
    </div>
  );
}
