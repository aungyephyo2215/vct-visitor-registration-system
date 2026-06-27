"use client";

import { format } from "date-fns";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  QrCode,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GateWorkflowStatus, VisitData } from "@/types/security-workflow";

interface GateVisitorSummaryProps {
  visit: VisitData;
  status: GateWorkflowStatus;
}

function badgeVariantForStatus(
  kind: GateWorkflowStatus["kind"],
): "default" | "secondary" | "outline" | "destructive" {
  switch (kind) {
    case "ready_for_checkin":
      return "default";
    case "currently_inside":
      return "secondary";
    case "completed":
      return "outline";
    case "expired":
    case "cancelled":
    case "blocked":
    case "invalid":
    case "error":
      return "destructive";
    default:
      return "outline";
  }
}

function formatSchedule(visit: VisitData) {
  if (visit.visit.expected_checkin_time) {
    return format(new Date(visit.visit.expected_checkin_time), "dd MMM yyyy • hh:mm a");
  }

  const invitation = visit.visit.invitations[0];
  if (!invitation?.expected_date) return "—";

  const base = format(new Date(invitation.expected_date), "dd MMM yyyy");
  return invitation.expected_time ? `${base} • ${invitation.expected_time}` : base;
}

export function GateVisitorSummary({ visit, status }: GateVisitorSummaryProps) {
  const invitation = visit.visit.invitations[0];
  const photo = visit.visit.verification?.photo_url || visit.visit.visitor?.photo_url || undefined;
  const displayName = visit.visit.visitor?.name || invitation?.visitor_name || "Unknown visitor";
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar size="lg" className="size-16">
                <AvatarImage src={photo} alt={displayName} />
                <AvatarFallback className="text-lg font-semibold">{initial}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl">{displayName}</CardTitle>
                <p className="text-muted-foreground text-sm">Primary gate workflow summary</p>
              </div>
            </div>
            <Badge variant={badgeVariantForStatus(status.kind)}>{status.title}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs tracking-wide uppercase">
                <UserRound className="h-3.5 w-3.5" />
                Visit Status
              </div>
              <div className="font-medium">{visit.visit.status.replaceAll("_", " ")}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs tracking-wide uppercase">
                <QrCode className="h-3.5 w-3.5" />
                QR Status
              </div>
              <div className="font-medium">{visit.qr.status.replaceAll("_", " ")}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs tracking-wide uppercase">
                <UserRound className="h-3.5 w-3.5" />
                Host
              </div>
              <div className="font-medium">{visit.visit.host?.name || "—"}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs tracking-wide uppercase">
                <Building2 className="h-3.5 w-3.5" />
                Unit / Property
              </div>
              <div className="font-medium">
                {visit.visit.unit.unit_no} • Floor {visit.visit.unit.floor}
              </div>
              <div className="text-muted-foreground text-sm">{visit.visit.property.name}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs tracking-wide uppercase">
                <ShieldAlert className="h-3.5 w-3.5" />
                Visit Purpose
              </div>
              <div className="font-medium">{visit.visit.purpose.replaceAll("_", " ")}</div>
              {visit.visit.notes && (
                <div className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                  {visit.visit.notes}
                </div>
              )}
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs tracking-wide uppercase">
                <CalendarClock className="h-3.5 w-3.5" />
                Scheduled Time
              </div>
              <div className="font-medium">{formatSchedule(visit)}</div>
            </div>
          </div>

          <div
            className={[
              "rounded-lg border px-4 py-3 text-sm",
              status.kind === "ready_for_checkin"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "",
              status.kind === "currently_inside"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "",
              ["expired", "cancelled", "blocked", "invalid", "error"].includes(status.kind)
                ? "border-destructive/20 bg-destructive/5 text-destructive"
                : "",
              ["idle", "loading", "ready_for_verification", "completed"].includes(status.kind)
                ? "border-border bg-muted/30 text-foreground"
                : "",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              {status.kind === "ready_for_checkin" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : status.kind === "currently_inside" ? (
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <div>
                <div className="font-medium">{status.title}</div>
                <div className="mt-1">{status.description}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
