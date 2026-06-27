/**
 * Shared types for the Security Gate workflow.
 *
 * Single source of truth for visit, verification, and gate-operation state
 * used by both scanner and verification surfaces.
 */

export interface VisitInvitationSummary {
  id: string;
  visitor_name: string;
  visitor_phone: string;
  visitor_type: string;
  status: string;
  expected_date?: string | null;
  expected_time?: string | null;
}

export interface VisitVisitorSummary {
  id: string;
  name: string;
  phone: string;
  id_type: string | null;
  id_number: string | null;
  photo_url: string | null;
}

export interface VisitVerificationSummary {
  id: string;
  photo_url: string | null;
  vehicle_number: string | null;
  nda_signed: boolean;
  safety_form_signed: boolean;
}

export interface VisitData {
  qr: {
    id: string;
    status: string;
    expires_at: string;
    used_at?: string | null;
  };
  visit: {
    id: string;
    status: string;
    purpose: string;
    notes: string | null;
    expected_checkin_time: string | null;
    checkin_time: string | null;
    checkout_time: string | null;
    property: { id: string; name: string };
    unit: { unit_no: string; floor: number };
    host: { id?: string; name: string } | null;
    visitor: VisitVisitorSummary | null;
    verification: VisitVerificationSummary | null;
    invitations: VisitInvitationSummary[];
  };
}

export interface VerificationData {
  id: string;
  visit_id: string;
  visitor_id: string | null;
  photo_url: string | null;
  vehicle_number: string | null;
  nda_signed: boolean;
  safety_form_signed: boolean;
  verified_by: string;
  verified_at: string;
  visitor?: VisitVisitorSummary | null;
  verifier?: { id: string; name: string } | null;
}

export interface VerificationFormPayload {
  visitor_name: string;
  visitor_phone: string;
  visitor_id_type?: string;
  visitor_id_number?: string;
  photo_url?: string;
  vehicle_number?: string;
  nda_signed: boolean;
  safety_form_signed: boolean;
}

export type GateWorkflowStatusKind =
  | "idle"
  | "loading"
  | "ready_for_verification"
  | "ready_for_checkin"
  | "currently_inside"
  | "completed"
  | "expired"
  | "cancelled"
  | "blocked"
  | "invalid"
  | "error";

export type GateWorkflowStatusTone = "default" | "success" | "warning" | "destructive" | "muted";

export interface GateWorkflowStatus {
  kind: GateWorkflowStatusKind;
  tone: GateWorkflowStatusTone;
  title: string;
  description: string;
  primaryAction:
    | { type: "verify"; label: string }
    | { type: "checkin"; label: string }
    | { type: "checkout"; label: string }
    | { type: "none"; label: string };
}

export const ID_TYPES = [
  { value: "NRC", label: "NRC" },
  { value: "PASSPORT", label: "Passport" },
  { value: "DRIVING_LICENSE", label: "Driving License" },
  { value: "COMPANY_ID", label: "Company ID" },
  { value: "OTHER", label: "Other" },
] as const;
