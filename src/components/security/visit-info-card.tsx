"use client";

import {
  QrCode,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  LogOut,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { VisitData } from "@/types/security-workflow";

interface VisitInfoCardProps {
  visitData: VisitData;
  hasVerification?: boolean;
  showDetailedStatus?: boolean;
}

/**
 * Displays visitor and visit information.
 *
 * Used by:
 * - Scanner page (compact view)
 * - Verification page (detailed view)
 */
export function VisitInfoCard({
  visitData,
  hasVerification = false,
  showDetailedStatus = false,
}: VisitInfoCardProps) {
  const isExpired = new Date(visitData.qr.expires_at) < new Date();
  const isCheckedOut = visitData.visit.status === "CHECKED_OUT";
  const isCheckedIn = visitData.visit.status === "CHECKED_IN";
  const isCancelled = visitData.visit.status === "CANCELLED";

  const getStatusBadge = () => {
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

  const invitation = visitData.visit.invitations?.[0];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {showDetailedStatus ? "Visit Status" : "Visitor Found"}
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {invitation && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Visitor</span>
            <span className="font-medium">{invitation.visitor_name}</span>
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
        {showDetailedStatus && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">QR Status</span>
            <span className="font-medium">{visitData.qr.status}</span>
          </div>
        )}
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
  );
}
