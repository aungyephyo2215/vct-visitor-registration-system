"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle,
  ExternalLink,
  LoaderCircle,
  LogOut,
  QrCode,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { QrScanner } from "@/components/qr-scanner";
import { GateVisitorSummary } from "@/components/security/gate-visitor-summary";
import { InlineVerificationDialog } from "@/components/security/inline-verification-dialog";
import type { VerificationFormData } from "@/components/security/verification-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useSecurityWorkflow } from "@/hooks/use-security-workflow";

export default function ScannerPage() {
  const router = useRouter();
  const workflow = useSecurityWorkflow();
  const [manualToken, setManualToken] = useState("");
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [scannerState, setScannerState] = useState<{
    hasCamera: boolean;
    error: string | null;
    isScanning: boolean;
    isPreparingCamera: boolean;
  }>({
    hasCamera: true,
    error: null,
    isScanning: false,
    isPreparingCamera: true,
  });
  const [countdownState, setCountdownState] = useState<{
    mode: "checkin" | "checkout";
    secondsLeft: number;
  } | null>(null);

  const currentVisit = workflow.currentVisit;
  const currentStatus = workflow.currentStatus;

  const verificationInitialData = useMemo(() => {
    if (!currentVisit) return undefined;

    const invitation = currentVisit.visit.invitations[0];
    const visitor = currentVisit.visit.visitor;
    const verification = workflow.existingVerification;

    return {
      visitor_name: visitor?.name || invitation?.visitor_name || "",
      visitor_phone: visitor?.phone || invitation?.visitor_phone || "",
      visitor_id_type: visitor?.id_type || undefined,
      visitor_id_number: visitor?.id_number || undefined,
      photo_url: verification?.photo_url || visitor?.photo_url || undefined,
      vehicle_number: verification?.vehicle_number || undefined,
      nda_signed: verification?.nda_signed ?? false,
      safety_form_signed: verification?.safety_form_signed ?? false,
    };
  }, [currentVisit, workflow.existingVerification]);

  const returnToScanner = useCallback(() => {
    setVerificationOpen(false);
    setManualToken("");
    setCountdownState(null);
    workflow.reset();
  }, [workflow]);

  useEffect(() => {
    if (!countdownState) return;

    const timer = window.setTimeout(() => {
      if (countdownState.secondsLeft <= 1) {
        returnToScanner();
        return;
      }

      setCountdownState((current) =>
        current
          ? {
              ...current,
              secondsLeft: current.secondsLeft - 1,
            }
          : null,
      );
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [countdownState, returnToScanner]);

  const handleLookup = useCallback(
    async (token: string) => {
      const trimmed = token.trim();
      if (!trimmed) {
        toast.error("QR token is required");
        return false;
      }

      setManualToken(trimmed);
      const success = await workflow.lookup(trimmed);
      if (!success) {
        toast.error(workflow.currentStatus.description || "Unable to validate this QR code");
      }
      return success;
    },
    [workflow],
  );

  const handleManualLookup = async () => {
    await handleLookup(manualToken);
  };

  const handleVerificationSubmit = async (data: VerificationFormData) => {
    const result = await workflow.verify(data);
    if (!result) return;

    setVerificationOpen(false);
    await workflow.refresh();
    toast.success("Verification completed. Ready to check in.");
  };

  const handleCheckIn = async () => {
    const success = await workflow.checkIn();
    if (!success) {
      toast.error(workflow.error || "Check-in failed");
      return;
    }

    toast.success("Visitor checked in. Host notified.");
    setCountdownState({ mode: "checkin", secondsLeft: 3 });
  };

  const handleCheckOut = async () => {
    const success = await workflow.checkOut();
    if (!success) {
      toast.error(workflow.error || "Check-out failed");
      return;
    }

    toast.success("Visitor checked out successfully.");
    setCountdownState({ mode: "checkout", secondsLeft: 3 });
  };

  const handlePrimaryAction = async () => {
    switch (currentStatus.primaryAction.type) {
      case "verify":
        setVerificationOpen(true);
        return;
      case "checkin":
        await handleCheckIn();
        return;
      case "checkout":
        await handleCheckOut();
        return;
      default:
        return;
    }
  };

  const scannerStatus = useMemo(() => {
    if (
      currentStatus.kind !== "idle" ||
      currentVisit ||
      scannerState.hasCamera ||
      scannerState.isScanning ||
      scannerState.isPreparingCamera
    ) {
      return currentStatus;
    }

    return {
      kind: "error" as const,
      tone: "warning" as const,
      title: "Camera unavailable",
      description:
        scannerState.error || "Camera could not be started. Use manual QR entry to continue.",
      primaryAction: { type: "none" as const, label: "Manual Lookup" },
    };
  }, [
    currentStatus,
    currentVisit,
    scannerState.error,
    scannerState.hasCamera,
    scannerState.isPreparingCamera,
    scannerState.isScanning,
  ]);

  const statusPanelClass = useMemo(() => {
    switch (scannerStatus.tone) {
      case "success":
        return "border-emerald-200 bg-emerald-50 text-emerald-900";
      case "warning":
        return "border-amber-200 bg-amber-50 text-amber-900";
      case "destructive":
        return "border-destructive/20 bg-destructive/5 text-destructive";
      case "muted":
        return "border-border bg-muted/30 text-muted-foreground";
      default:
        return "border-border bg-background text-foreground";
    }
  }, [scannerStatus.tone]);

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-20">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gate Operations</h1>
        <p className="text-muted-foreground">
          Scan once, verify inline, and complete check-in / check-out without leaving this page.
        </p>
      </div>

      {countdownState && (
        <Card className="border-emerald-200 bg-emerald-50 text-emerald-950">
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div>
              <div className="font-semibold">
                {countdownState.mode === "checkin" ? "Check-in completed" : "Check-out completed"}
              </div>
              <div className="text-sm text-emerald-900/80">
                Returning to the live scanner in {countdownState.secondsLeft} second
                {countdownState.secondsLeft === 1 ? "" : "s"}.
              </div>
            </div>
            <Button variant="outline" onClick={returnToScanner}>
              Return Now
            </Button>
          </CardContent>
        </Card>
      )}

      {!currentVisit ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Live QR Scanner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <QrScanner
              onScanResult={handleLookup}
              paused={!!countdownState}
              autoStart
              processing={workflow.loading}
              onCameraStateChange={setScannerState}
            />

            <div className={`rounded-lg border px-4 py-3 text-sm ${statusPanelClass}`}>
              <div className="font-medium">{scannerStatus.title}</div>
              <div className="mt-1">{scannerStatus.description}</div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background text-muted-foreground px-2">
                  {!scannerState.hasCamera && !scannerState.isScanning
                    ? "Manual fallback only"
                    : "Manual QR entry"}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Paste QR token or QR access URL"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleManualLookup()}
              />
              <Button
                onClick={handleManualLookup}
                disabled={workflow.loading || !manualToken.trim()}
              >
                {workflow.loading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="ml-2">Lookup</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <GateVisitorSummary visit={currentVisit} status={currentStatus} />

          <Card>
            <CardHeader>
              <CardTitle>Gate Action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentStatus.primaryAction.type !== "none" ? (
                <Button
                  onClick={handlePrimaryAction}
                  disabled={workflow.loading}
                  className="w-full"
                  size="lg"
                >
                  {workflow.loading ? (
                    <>
                      <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : currentStatus.primaryAction.type === "verify" ? (
                    <>
                      <ShieldCheck className="mr-2 h-5 w-5" />
                      {currentStatus.primaryAction.label}
                    </>
                  ) : currentStatus.primaryAction.type === "checkin" ? (
                    <>
                      <CheckCircle className="mr-2 h-5 w-5" />
                      {currentStatus.primaryAction.label}
                    </>
                  ) : (
                    <>
                      <LogOut className="mr-2 h-5 w-5" />
                      {currentStatus.primaryAction.label}
                    </>
                  )}
                </Button>
              ) : (
                <div className={`rounded-lg border px-4 py-3 text-sm ${statusPanelClass}`}>
                  <div className="font-medium">{currentStatus.title}</div>
                  <div className="mt-1">{currentStatus.description}</div>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => router.push(`/visits/${currentVisit.visit.id}`)}
                className="w-full"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Full Details
              </Button>

              <Button onClick={returnToScanner} variant="ghost" className="w-full">
                <ArrowRight className="mr-2 h-4 w-4" />
                Return to Scanner
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <InlineVerificationDialog
        open={verificationOpen}
        loading={workflow.loading}
        initialData={verificationInitialData}
        onOpenChange={setVerificationOpen}
        onSubmit={handleVerificationSubmit}
      />
    </div>
  );
}
