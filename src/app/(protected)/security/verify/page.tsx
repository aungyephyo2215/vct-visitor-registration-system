"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, CheckCircle, LogOut, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VisitInfoCard } from "@/components/security/visit-info-card";
import { VerificationForm } from "@/components/security/verification-form";
import { useSecurityWorkflow } from "@/hooks/use-security-workflow";
import type { VerificationFormData } from "@/components/security/verification-form";
import { toast } from "sonner";

export default function SecurityVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") || "");
  const autoLookupDone = useRef(false);

  const workflow = useSecurityWorkflow({
    token,
  });

  // Auto-lookup when token is provided via URL
  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (urlToken && !autoLookupDone.current) {
      autoLookupDone.current = true;
      setToken(urlToken);
      workflow.lookup();
    }
  }, [searchParams, workflow]);

  const handleLookup = () => {
    if (!token.trim()) {
      toast.error("QR token is required");
      return;
    }
    workflow.lookup();
  };

  const handleVerify = async (data: VerificationFormData) => {
    const verification = await workflow.verify(data);
    if (verification) {
      toast.success("Verification completed");
    }
  };

  const handleCheckIn = async () => {
    const success = await workflow.checkIn();
    if (success) {
      toast.success("Check-in successful");
    }
  };

  const handleCheckOut = async () => {
    const success = await workflow.checkOut();
    if (success) {
      toast.success("Check-out successful");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Security Verification</h1>
        <p className="text-muted-foreground">
          Verify visitor identity and manage check-in/check-out
        </p>
      </div>

      {/* Token Input */}
      {!workflow.visitData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Look Up Visitor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter QR token or paste URL"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              />
              <Button onClick={handleLookup} disabled={workflow.loading || !token.trim()}>
                {workflow.loading ? "Looking up..." : "Look Up"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {workflow.loading && !workflow.visitData && (
        <div className="flex items-center justify-center py-12">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        </div>
      )}

      {/* Visit Found */}
      {workflow.visitData && (
        <>
          <VisitInfoCard
            visitData={workflow.visitData}
            hasVerification={workflow.hasVerification}
            showDetailedStatus
          />

          {/* Verification Form (if needed) */}
          {workflow.needsVerification && (
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
              onSubmit={handleVerify}
              submitLabel="Complete Verification"
              showPhotoField
            />
          )}

          {/* Verification Summary (if already verified) */}
          {workflow.hasVerification && workflow.existingVerification && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Verification Complete
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">NDA Signed</span>
                    <Badge
                      variant={workflow.existingVerification.nda_signed ? "default" : "destructive"}
                    >
                      {workflow.existingVerification.nda_signed ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Safety Form</span>
                    <Badge
                      variant={
                        workflow.existingVerification.safety_form_signed ? "default" : "destructive"
                      }
                    >
                      {workflow.existingVerification.safety_form_signed ? "Yes" : "No"}
                    </Badge>
                  </div>
                  {workflow.existingVerification.vehicle_number && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vehicle</span>
                      <span className="font-medium">
                        {workflow.existingVerification.vehicle_number}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {workflow.needsCheckIn && (
                  <Button
                    onClick={handleCheckIn}
                    disabled={workflow.loading}
                    className="w-full"
                    size="lg"
                  >
                    {workflow.loading ? (
                      "Checking in..."
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-5 w-5" />
                        Check In {workflow.visitData.visit.visitor?.name || "Visitor"}
                      </>
                    )}
                  </Button>
                )}

                {workflow.needsCheckOut && (
                  <Button
                    onClick={handleCheckOut}
                    disabled={workflow.loading}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    {workflow.loading ? (
                      "Checking out..."
                    ) : (
                      <>
                        <LogOut className="mr-2 h-5 w-5" />
                        Check Out {workflow.visitData.visit.visitor?.name || "Visitor"}
                      </>
                    )}
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => router.push(`/visits/${workflow.visitData?.visit.id}`)}
                  className="w-full"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Visit Details
                </Button>

                <Button
                  onClick={() => {
                    workflow.reset();
                    autoLookupDone.current = false;
                  }}
                  variant="ghost"
                  className="w-full"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Look Up Another
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Error Display */}
      {workflow.error && (
        <div className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          {workflow.error}
        </div>
      )}
    </div>
  );
}
