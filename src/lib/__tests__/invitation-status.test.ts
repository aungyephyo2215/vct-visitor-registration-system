import { describe, it, expect } from "vitest";
import {
  getWorkflowProgress,
  getNextAction,
  INVITATION_STATUS_LABELS,
  INVITATION_STATUS_VARIANTS,
  INVITATION_WORKFLOW_STEPS,
} from "../invitation-status";
import type { InvitationData, VisitData } from "../invitation-status";

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

describe("INVITATION_STATUS_LABELS", () => {
  it("has labels for all statuses", () => {
    expect(INVITATION_STATUS_LABELS.PENDING).toBe("Pending");
    expect(INVITATION_STATUS_LABELS.APPROVED).toBe("Approved");
    expect(INVITATION_STATUS_LABELS.REJECTED).toBe("Rejected");
    expect(INVITATION_STATUS_LABELS.EXPIRED).toBe("Expired");
    expect(INVITATION_STATUS_LABELS.CANCELLED).toBe("Cancelled");
  });
});

describe("INVITATION_STATUS_VARIANTS", () => {
  it("has a variant for every status label", () => {
    for (const key of Object.keys(INVITATION_STATUS_LABELS)) {
      expect(INVITATION_STATUS_VARIANTS[key]).toBeDefined();
    }
  });
});

describe("INVITATION_WORKFLOW_STEPS", () => {
  it("has 8 ordered steps", () => {
    expect(INVITATION_WORKFLOW_STEPS).toHaveLength(8);
    expect(INVITATION_WORKFLOW_STEPS[0].key).toBe("created");
    expect(INVITATION_WORKFLOW_STEPS[7].key).toBe("checked_out");
  });
});

// ---------------------------------------------------------------------------
// getWorkflowProgress
// ---------------------------------------------------------------------------

function makeInvitation(overrides: Partial<InvitationData> = {}): InvitationData {
  return {
    status: "PENDING",
    created_at: "2026-07-01T10:00:00Z",
    visit_id: null,
    reason: null,
    qrCode: null,
    qrEmailDelivery: null,
    ...overrides,
  };
}

describe("getWorkflowProgress", () => {
  it("shows 'created' completed and 'under_review' as current for PENDING", () => {
    const steps = getWorkflowProgress(makeInvitation());
    expect(steps[0].state).toBe("completed");
    expect(steps[1].state).toBe("current");
    expect(steps[2].state).toBe("upcoming");
  });

  it("shows 'approved' as completed and 'qr_generated' as current when APPROVED without QR", () => {
    const steps = getWorkflowProgress(makeInvitation({ status: "APPROVED" }));
    expect(steps[0].state).toBe("completed"); // created
    expect(steps[1].state).toBe("completed"); // under_review
    expect(steps[2].state).toBe("completed"); // approved
    expect(steps[3].state).toBe("current"); // qr_generated
  });

  it("shows 'qr_generated' as completed and 'email_sent' as current when APPROVED with active QR", () => {
    const steps = getWorkflowProgress(
      makeInvitation({
        status: "APPROVED",
        qrCode: { hasActive: true },
      }),
    );
    expect(steps[3].state).toBe("completed"); // qr_generated
    expect(steps[4].state).toBe("current"); // email_sent
  });

  it("marks steps up to 'under_review' as rejected for REJECTED", () => {
    const steps = getWorkflowProgress(
      makeInvitation({ status: "REJECTED", reason: "Not allowed" }),
    );
    expect(steps[0].state).toBe("completed");
    expect(steps[1].state).toBe("rejected");
    expect(steps[2].state).toBe("upcoming");
  });

  it("marks 'under_review' as expired for EXPIRED", () => {
    const steps = getWorkflowProgress(makeInvitation({ status: "EXPIRED" }));
    expect(steps[0].state).toBe("completed");
    expect(steps[1].state).toBe("expired");
    expect(steps[2].state).toBe("upcoming");
  });

  it("marks everything after 'created' as cancelled for CANCELLED", () => {
    const steps = getWorkflowProgress(makeInvitation({ status: "CANCELLED" }));
    expect(steps[0].state).toBe("completed");
    expect(steps[1].state).toBe("cancelled");
    expect(steps[7].state).toBe("cancelled");
  });

  it("shows email_sent as completed and visitor_arrived as current when delivery status is SENT", () => {
    const steps = getWorkflowProgress(
      makeInvitation({
        status: "APPROVED",
        qrCode: { hasActive: true },
        qrEmailDelivery: { status: "SENT" },
      }),
    );
    expect(steps[3].state).toBe("completed"); // qr_generated
    expect(steps[4].state).toBe("completed"); // email_sent
    expect(steps[5].state).toBe("current"); // visitor_arrived
  });

  it("shows checked_in as current when visit is CHECKED_IN", () => {
    const visit: VisitData = {
      status: "CHECKED_IN",
      checked_in_at: "2026-07-10T09:00:00Z",
      checked_out_at: null,
    };
    const steps = getWorkflowProgress(
      makeInvitation({
        status: "APPROVED",
        qrCode: { hasActive: true },
        qrEmailDelivery: { status: "SENT" },
      }),
      visit,
    );
    expect(steps[6].state).toBe("current"); // checked_in
  });

  it("shows all steps completed when visit is CHECKED_OUT", () => {
    const visit: VisitData = {
      status: "CHECKED_OUT",
      checked_in_at: "2026-07-10T09:00:00Z",
      checked_out_at: "2026-07-10T17:00:00Z",
    };
    const steps = getWorkflowProgress(
      makeInvitation({
        status: "APPROVED",
        qrCode: { hasActive: true },
        qrEmailDelivery: { status: "SENT" },
      }),
      visit,
    );
    // All 8 steps should be completed
    for (const s of steps) {
      expect(s.state).toBe("completed");
    }
  });
});

// ---------------------------------------------------------------------------
// getNextAction
// ---------------------------------------------------------------------------

describe("getNextAction", () => {
  it("returns approve action for PENDING + admin role", () => {
    const action = getNextAction(makeInvitation({ status: "PENDING" }), "PROPERTY_ADMIN");
    expect(action.actionType).toBe("approve");
    expect(action.responsibleRole).toContain("Admin");
  });

  it("returns wait_approval for PENDING + resident role", () => {
    const action = getNextAction(makeInvitation({ status: "PENDING" }), "RESIDENT");
    expect(action.actionType).toBe("wait_approval");
  });

  it("returns generate_qr for APPROVED without QR + admin", () => {
    const action = getNextAction(makeInvitation({ status: "APPROVED" }), "PROPERTY_ADMIN");
    expect(action.actionType).toBe("generate_qr");
  });

  it("returns wait_visitor for APPROVED with QR + email sent", () => {
    const action = getNextAction(
      makeInvitation({
        status: "APPROVED",
        qrCode: { hasActive: true },
        qrEmailDelivery: { status: "SENT" },
      }),
      "RESIDENT",
    );
    expect(action.actionType).toBe("wait_visitor");
  });

  it("returns check_in for APPROVED + security when QR email sent", () => {
    const action = getNextAction(
      makeInvitation({
        status: "APPROVED",
        qrCode: { hasActive: true },
        qrEmailDelivery: { status: "SENT" },
      }),
      "SECURITY_GUARD",
    );
    expect(action.actionType).toBe("check_in");
  });

  it("returns check_out for CHECKED_IN visit + security", () => {
    const action = getNextAction(
      makeInvitation({
        status: "APPROVED",
        qrCode: { hasActive: true },
        qrEmailDelivery: { status: "SENT" },
      }),
      "SECURITY_GUARD",
      { status: "CHECKED_IN", checked_in_at: "2026-07-10T09:00:00Z", checked_out_at: null },
    );
    expect(action.actionType).toBe("check_out");
  });

  it("returns none for REJECTED", () => {
    const action = getNextAction(makeInvitation({ status: "REJECTED", reason: "No" }), "RESIDENT");
    expect(action.actionType).toBe("none");
    expect(action.label).toContain("rejected");
  });

  it("returns none for EXPIRED", () => {
    const action = getNextAction(makeInvitation({ status: "EXPIRED" }), "RESIDENT");
    expect(action.actionType).toBe("none");
    expect(action.label).toContain("expired");
  });

  it("returns none for CANCELLED", () => {
    const action = getNextAction(makeInvitation({ status: "CANCELLED" }), "RESIDENT");
    expect(action.actionType).toBe("none");
    expect(action.label).toContain("cancelled");
  });
});
