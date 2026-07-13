"use client";

import {
  CheckCircle,
  Clock,
  Mail,
  QrCode,
  ShieldCheck,
  LogOut,
  AlertTriangle,
  XCircle,
  UserCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getNextAction, type InvitationData, type VisitData } from "@/lib/invitation-status";

interface InvitationNextActionProps {
  invitation: InvitationData & { reason?: string | null };
  userRole: string;
  visit?: VisitData | null;
}

const ACTION_ICONS: Record<string, typeof CheckCircle> = {
  none: Clock,
  approve: CheckCircle,
  reject: XCircle,
  generate_qr: QrCode,
  resend_email: Mail,
  wait_approval: Clock,
  wait_visitor: Clock,
  check_in: ShieldCheck,
  check_out: LogOut,
};

const ACTION_COLORS: Record<string, string> = {
  none: "text-muted-foreground",
  approve: "text-green-600",
  reject: "text-destructive",
  generate_qr: "text-blue-600",
  resend_email: "text-blue-600",
  wait_approval: "text-amber-600",
  wait_visitor: "text-muted-foreground",
  check_in: "text-green-600",
  check_out: "text-amber-600",
};

export function InvitationNextAction({ invitation, userRole, visit }: InvitationNextActionProps) {
  const nextAction = getNextAction(invitation, userRole, visit);
  const Icon = ACTION_ICONS[nextAction.actionType] ?? Clock;
  const iconColor = ACTION_COLORS[nextAction.actionType] ?? "text-muted-foreground";

  const isTerminal = ["REJECTED", "EXPIRED", "CANCELLED"].includes(invitation.status);
  const isWaiting = nextAction.actionType.startsWith("wait_");

  return (
    <Card
      className={
        isTerminal
          ? "border-dashed"
          : isWaiting
            ? "border-amber-200 bg-amber-50/50"
            : "border-green-200 bg-green-50/50"
      }
    >
      <CardContent className="flex items-start gap-3 py-4">
        <div className={`mt-0.5 ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{nextAction.label}</span>
            {nextAction.responsibleRole !== "—" && (
              <Badge variant="outline" className="text-xs">
                <UserCheck className="mr-1 h-3 w-3" />
                {nextAction.responsibleRole}
              </Badge>
            )}
          </div>
          {nextAction.description && (
            <p className="text-muted-foreground text-xs">{nextAction.description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
