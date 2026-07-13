/**
 * Shared invitation status utilities.
 *
 * Centralizes labels, badge variants, workflow step definitions, and
 * pure helper functions used by the invitation list and detail pages.
 */

// ---------------------------------------------------------------------------
// Status labels & badge variants
// ---------------------------------------------------------------------------

export const INVITATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

export const INVITATION_STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
  EXPIRED: "secondary",
  CANCELLED: "outline",
};

// ---------------------------------------------------------------------------
// Workflow step definitions
// ---------------------------------------------------------------------------

export interface WorkflowStep {
  /** Unique key for the step. */
  key: string;
  /** Short label shown next to the step dot. */
  label: string;
  /** Longer description shown in onboarding hints. */
  description: string;
  /** Role typically responsible for this step. */
  responsibleRole: string;
}

/**
 * The ordered steps of a successful invitation lifecycle.
 * Terminal / branch states (rejected, expired, cancelled) are handled
 * separately in `getWorkflowProgress`.
 */
export const INVITATION_WORKFLOW_STEPS: WorkflowStep[] = [
  {
    key: "created",
    label: "Created",
    description:
      "Resident or staff creates a visitor invitation with visitor details and expected date.",
    responsibleRole: "Resident",
  },
  {
    key: "under_review",
    label: "Under Review",
    description: "Property admin or office staff reviews the invitation for approval.",
    responsibleRole: "Admin / Office Staff",
  },
  {
    key: "approved",
    label: "Approved",
    description: "The invitation is approved and ready for QR code generation.",
    responsibleRole: "Admin / Office Staff",
  },
  {
    key: "qr_generated",
    label: "QR Generated",
    description: "A QR code is generated and linked to a visit record.",
    responsibleRole: "Admin / Office Staff",
  },
  {
    key: "email_sent",
    label: "Email Sent",
    description: "The QR code is emailed to the visitor so they can present it at the gate.",
    responsibleRole: "System (automatic)",
  },
  {
    key: "visitor_arrived",
    label: "Visitor Arrived",
    description: "The visitor scans their QR code at the security gate.",
    responsibleRole: "Visitor / Security",
  },
  {
    key: "checked_in",
    label: "Checked In",
    description: "Security verifies the visitor and completes check-in.",
    responsibleRole: "Security Guard",
  },
  {
    key: "checked_out",
    label: "Checked Out",
    description: "The visitor leaves and security completes check-out.",
    responsibleRole: "Security Guard",
  },
];

// ---------------------------------------------------------------------------
// Workflow progress computation
// ---------------------------------------------------------------------------

export interface InvitationData {
  status: string;
  created_at: string;
  visit_id: string | null;
  reason: string | null;
  qrCode?: { hasActive: boolean } | null;
  qrEmailDelivery?: { status: string } | null;
}

export interface VisitData {
  status: string;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
}

export interface WorkflowStepState {
  step: WorkflowStep;
  /** "completed" | "current" | "upcoming" | "rejected" | "expired" | "cancelled" */
  state: "completed" | "current" | "upcoming" | "rejected" | "expired" | "cancelled";
  /** Timestamp if the step has been completed. */
  completedAt?: string;
}

/**
 * Compute the visual state of each workflow step for a given invitation.
 */
export function getWorkflowProgress(
  invitation: InvitationData,
  visit?: VisitData | null,
): WorkflowStepState[] {
  const { status } = invitation;
  const hasQr = Boolean(invitation.qrCode?.hasActive);
  const emailSent = invitation.qrEmailDelivery?.status === "SENT";
  const visitStatus = visit?.status;

  // Determine the highest completed step index (0-based) and which is "current".
  // For terminal states (rejected, expired, cancelled) we handle separately.
  let completedUpTo = -1; // index of last completed step (-1 = none)
  let currentIdx = 0; // index of the current step

  if (status === "PENDING") {
    completedUpTo = 0; // created is done
    currentIdx = 1; // under_review is current
  } else if (status === "APPROVED") {
    completedUpTo = 2; // created, under_review, approved are done
    if (hasQr) {
      completedUpTo = 3; // qr_generated is done
      if (emailSent) {
        completedUpTo = 4; // email_sent is done
        if (visitStatus === "CHECKED_IN") {
          completedUpTo = 5; // visitor_arrived is done
          currentIdx = 6; // checked_in is current
        } else if (visitStatus === "CHECKED_OUT") {
          completedUpTo = 7; // all done
          currentIdx = 7; // checked_out is current (completed)
        } else {
          currentIdx = 5; // visitor_arrived is current
        }
      } else {
        currentIdx = 4; // email_sent is current
      }
    } else {
      currentIdx = 3; // qr_generated is current
    }
  }

  const result: WorkflowStepState[] = INVITATION_WORKFLOW_STEPS.map((step, index) => {
    // Terminal states
    if (status === "REJECTED") {
      if (index < 1) {
        return { step, state: "completed", completedAt: invitation.created_at };
      }
      if (index === 1) {
        return { step, state: "rejected" };
      }
      return { step, state: "upcoming" };
    }

    if (status === "EXPIRED") {
      if (index === 0) {
        return { step, state: "completed", completedAt: invitation.created_at };
      }
      if (index === 1) {
        return { step, state: "expired" };
      }
      return { step, state: "upcoming" };
    }

    if (status === "CANCELLED") {
      if (index === 0) {
        return { step, state: "completed", completedAt: invitation.created_at };
      }
      return { step, state: "cancelled" };
    }

    // Active states (PENDING, APPROVED)
    if (index <= completedUpTo) {
      return { step, state: "completed" };
    }
    if (index === currentIdx) {
      return { step, state: "current" };
    }
    return { step, state: "upcoming" };
  });

  return result;
}

// ---------------------------------------------------------------------------
// Next-action guidance
// ---------------------------------------------------------------------------

export interface NextAction {
  /** Short action label for the button / heading. */
  label: string;
  /** Description of why this step matters. */
  description: string;
  /** Who should perform this action. */
  responsibleRole: string;
  /** Action type for triggering the right handler. */
  actionType:
    | "none"
    | "approve"
    | "reject"
    | "generate_qr"
    | "resend_email"
    | "wait_approval"
    | "wait_visitor"
    | "check_in"
    | "check_out";
}

/**
 * Determine the recommended next action based on invitation status and user role.
 */
export function getNextAction(
  invitation: InvitationData,
  userRole: string,
  visit?: VisitData | null,
): NextAction {
  const { status } = invitation;
  const hasQr = Boolean(invitation.qrCode?.hasActive);
  const emailSent = invitation.qrEmailDelivery?.status === "SENT";
  const isApprover = ["SUPER_ADMIN", "PROPERTY_ADMIN", "OFFICE_STAFF"].includes(userRole);
  const isSecurity = ["SECURITY_GUARD"].includes(userRole);

  // Terminal states
  if (status === "REJECTED") {
    return {
      label: "Invitation was rejected",
      description: `Reason: ${invitation.reason || "No reason provided"}. The visitor was notified.`,
      responsibleRole: "—",
      actionType: "none",
    };
  }
  if (status === "EXPIRED") {
    return {
      label: "Invitation has expired",
      description: "The expected visit date has passed. Create a new invitation if needed.",
      responsibleRole: "Resident",
      actionType: "none",
    };
  }
  if (status === "CANCELLED") {
    return {
      label: "Invitation was cancelled",
      description: "This invitation has been cancelled and is no longer active.",
      responsibleRole: "—",
      actionType: "none",
    };
  }

  // PENDING — needs approval
  if (status === "PENDING") {
    if (isApprover) {
      return {
        label: "Review this invitation",
        description:
          "Approve or reject this visitor invitation. The inviter and visitor will be notified of your decision.",
        responsibleRole: "Admin / Office Staff",
        actionType: "approve",
      };
    }
    return {
      label: "Waiting for admin review",
      description:
        "An admin or office staff member needs to approve this invitation before a QR code can be generated.",
      responsibleRole: "Admin / Office Staff",
      actionType: "wait_approval",
    };
  }

  // APPROVED — depends on QR state
  if (status === "APPROVED") {
    if (!hasQr) {
      if (isApprover || isSecurity) {
        return {
          label: "Generate QR code",
          description:
            "Generate a QR code for this visitor. The QR code will be emailed automatically.",
          responsibleRole: "Admin / Office Staff",
          actionType: "generate_qr",
        };
      }
      return {
        label: "QR code pending",
        description: "An admin needs to generate a QR code for this visitor.",
        responsibleRole: "Admin / Office Staff",
        actionType: "wait_approval",
      };
    }

    // Has QR — check visit status
    if (visit?.status === "CHECKED_OUT") {
      return {
        label: "Visit completed",
        description: "The visitor has been checked in and checked out. No further action needed.",
        responsibleRole: "—",
        actionType: "none",
      };
    }
    if (visit?.status === "CHECKED_IN") {
      if (isSecurity) {
        return {
          label: "Check out visitor",
          description: "The visitor is currently inside. Check them out when they leave.",
          responsibleRole: "Security Guard",
          actionType: "check_out",
        };
      }
      return {
        label: "Visitor is inside",
        description: "The visitor has been checked in and is currently on-site.",
        responsibleRole: "Security Guard",
        actionType: "wait_visitor",
      };
    }
    if (!emailSent) {
      return {
        label: "QR email pending",
        description: "The QR code has been generated. Waiting for email delivery to the visitor.",
        responsibleRole: "System",
        actionType: "resend_email",
      };
    }

    // QR generated, email sent, waiting for visitor
    if (isSecurity) {
      return {
        label: "Awaiting visitor arrival",
        description: "The visitor should scan their QR code at the gate when they arrive.",
        responsibleRole: "Visitor / Security",
        actionType: "check_in",
      };
    }
    return {
      label: "Waiting for visitor",
      description:
        "The QR code has been emailed to the visitor. They should scan it at the security gate upon arrival.",
      responsibleRole: "Visitor / Security",
      actionType: "wait_visitor",
    };
  }

  // Fallback
  return {
    label: "No action needed",
    description: "",
    responsibleRole: "—",
    actionType: "none",
  };
}
