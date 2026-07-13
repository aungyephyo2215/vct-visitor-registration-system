"use client";

import {
  CheckCircle,
  Circle,
  Clock,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Mail,
  QrCode,
  ScanLine,
  ShieldCheck,
  LogOut,
  UserPlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getWorkflowProgress, type InvitationData, type VisitData } from "@/lib/invitation-status";

interface InvitationWorkflowProgressProps {
  invitation: InvitationData;
  visit?: VisitData | null;
}

const STEP_ICONS: Record<string, typeof CheckCircle> = {
  created: UserPlus,
  under_review: Clock,
  approved: CheckCircle,
  qr_generated: QrCode,
  email_sent: Mail,
  visitor_arrived: ScanLine,
  checked_in: ShieldCheck,
  checked_out: LogOut,
};

const STATE_STYLES: Record<
  string,
  { dot: string; text: string; badge: "default" | "secondary" | "destructive" | "outline" }
> = {
  completed: {
    dot: "bg-green-500",
    text: "",
    badge: "default",
  },
  current: {
    dot: "bg-blue-500 ring-4 ring-blue-500/20",
    text: "text-foreground font-medium",
    badge: "default",
  },
  upcoming: {
    dot: "bg-muted-foreground/30",
    text: "text-muted-foreground",
    badge: "secondary",
  },
  rejected: {
    dot: "bg-destructive",
    text: "text-destructive font-medium",
    badge: "destructive",
  },
  expired: {
    dot: "bg-amber-500",
    text: "text-amber-600 font-medium",
    badge: "secondary",
  },
  cancelled: {
    dot: "bg-muted-foreground/40",
    text: "text-muted-foreground line-through",
    badge: "outline",
  },
};

export function InvitationWorkflowProgress({ invitation, visit }: InvitationWorkflowProgressProps) {
  const steps = getWorkflowProgress(invitation, visit);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Workflow Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-0">
          {steps.map((item, index) => {
            const Icon = STEP_ICONS[item.step.key] ?? Circle;
            const styles = STATE_STYLES[item.state];
            const isLast = index === steps.length - 1;
            const showConnector = !isLast && item.state !== "rejected";

            return (
              <div key={item.step.key} className="relative flex gap-3">
                {/* Vertical connector line */}
                {showConnector && (
                  <div className="bg-border absolute top-6 left-[11px] h-full w-px" />
                )}

                {/* Step dot / icon */}
                <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center">
                  {item.state === "completed" ? (
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full ${styles.dot}`}
                    >
                      <CheckCircle className="h-3.5 w-3.5 text-white" />
                    </div>
                  ) : item.state === "current" ? (
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full ${styles.dot}`}
                    >
                      <Icon className="h-3 w-3 text-white" />
                    </div>
                  ) : item.state === "rejected" ? (
                    <div className="bg-destructive flex h-6 w-6 items-center justify-center rounded-full">
                      <XCircle className="h-3.5 w-3.5 text-white" />
                    </div>
                  ) : item.state === "expired" ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500">
                      <AlertTriangle className="h-3 w-3 text-white" />
                    </div>
                  ) : (
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-current ${styles.dot.replace("bg-", "text-")}`}
                    >
                      <Circle className="h-2 w-2 fill-current" />
                    </div>
                  )}
                </div>

                {/* Step content */}
                <div className={`flex-1 pb-4 ${styles.text}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{item.step.label}</span>
                    {item.state === "current" && (
                      <Badge variant="outline" className="text-xs">
                        Current
                      </Badge>
                    )}
                  </div>
                  {item.state === "current" || item.state === "completed" ? (
                    <p className="text-muted-foreground mt-0.5 text-xs">{item.step.description}</p>
                  ) : null}
                  {item.state === "rejected" && (
                    <p className="text-destructive/80 mt-0.5 text-xs">
                      {invitation.reason || "Invitation was rejected"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Onboarding hint */}
        <div className="border-border bg-muted/30 mt-2 flex items-start gap-2 rounded-md border border-dashed px-3 py-2.5">
          <HelpCircle className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-muted-foreground text-xs">
            This workflow shows the visitor&apos;s journey from invitation creation to check-out.
            Steps are completed as the visitor progresses through each stage. <strong>Green</strong>{" "}
            = done, <strong>blue</strong> = current step, <strong>muted</strong> = upcoming.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
