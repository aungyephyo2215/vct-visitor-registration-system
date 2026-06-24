/**
 * Shared types for the Security Gate workflow.
 *
 * Single source of truth for VisitData, VerificationData,
 * and constants used by both Scanner and Verification pages.
 */

export interface VisitData {
  qr: {
    id: string;
    status: string;
    expires_at: string;
  };
  visit: {
    id: string;
    status: string;
    unit: { unit_no: string; floor: number };
    host: { name: string } | null;
    visitor: { id: string; name: string; phone: string } | null;
    invitations: {
      id: string;
      visitor_name: string;
      visitor_phone: string;
      visitor_type: string;
      status: string;
    }[];
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
}

export const ID_TYPES = [
  { value: "NRC", label: "NRC" },
  { value: "PASSPORT", label: "Passport" },
  { value: "DRIVING_LICENSE", label: "Driving License" },
  { value: "COMPANY_ID", label: "Company ID" },
  { value: "OTHER", label: "Other" },
] as const;

export type ScannerStep = "scan" | "result" | "verify" | "success";
