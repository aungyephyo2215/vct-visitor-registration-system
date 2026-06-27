"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, CheckCircle, LogOut, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GateVisitorSummary } from "@/components/security/gate-visitor-summary";
import { VerificationForm } from "@/components/security/verification-form";
import { useSecurityWorkflow } from "@/hooks/use-security-workflow";
import type { VerificationFormData } from "@/components/security/verification-form";
import { toast } from "sonner";

export default function SecurityVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoLookupDone = useRef(false);
  const [token, setToken] = useState(searchParams.get("token") || "");

  const workflow = useSecurityWorkflow();

  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (!urlToken || autoLookupDone.current) return;

    autoLookupDone.current = true;
    setToken(urlToken);
    void workflow.lookup(urlToken);
  }, [searchParams, workflow]);

  const handleLookup = async () => {
    if (!token.trim()) {
      toast.error("QR token is required");
      return;
    }

    const success = await workflow.lookup(token);
    if (!success) {
      toast.error(workflow.currentStatus.description || "Unable to look up visitor");
    }
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
          Look up a visitor, complete verification, and manage check-in / check-out.
        </p>
      </div>

      {!workflow.currentVisit && (
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
                onKeyDown={(e) => e.key === "Enter" && void handleLookup()}
              />
              <Button onClick={handleLookup} disabled={workflow.loading || !token.trim()}>
                {workflow.loading ? "Looking up..." : "Look Up"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {workflow.currentVisit && (
        <>
          <GateVisitorSummary visit={workflow.currentVisit} status={workflow.currentStatus} />

          {workflow.needsVerification && (
            <VerificationForm
              key={workflow.currentVisit.visit.id}
              initialData={{
                visitor_name:
                  workflow.currentVisit.visit.visitor?.name ||
                  workflow.currentVisit.visit.invitations?.[0]?.visitor_name ||
                  "",
                visitor_phone:
                  workflow.currentVisit.visit.visitor?.phone ||
                  workflow.currentVisit.visit.invitations?.[0]?.visitor_phone ||
                  "",
                visitor_id_type: workflow.currentVisit.visit.visitor?.id_type || undefined,
                visitor_id_number: workflow.currentVisit.visit.visitor?.id_number || undefined,
                photo_url:
                  workflow.existingVerification?.photo_url ||
                  workflow.currentVisit.visit.visitor?.photo_url ||
                  undefined,
                vehicle_number: workflow.existingVerification?.vehicle_number || undefined,
                nda_signed: workflow.existingVerification?.nda_signed ?? false,
                safety_form_signed: workflow.existingVerification?.safety_form_signed ?? false,
              }}
              loading={workflow.loading}
              onSubmit={handleVerify}
              submitLabel="Complete Verification"
            />
          )}

          {workflow.existingVerification && (
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
                        Check In {workflow.currentVisit.visit.visitor?.name || "Visitor"}
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
                        Check Out {workflow.currentVisit.visit.visitor?.name || "Visitor"}
                      </>
                    )}
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => router.push(`/visits/${workflow.currentVisit?.visit.id}`)}
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

      {workflow.error && (
        <div className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          {workflow.currentStatus.description}
        </div>
      )}
    </div>
  );
}
