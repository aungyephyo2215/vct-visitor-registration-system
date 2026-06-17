/**
 * Pure business-rule functions for invitation workflow.
 * No side effects — designed for unit testing without mocks.
 */

import type { SafeUser } from "./types";
import type { UserRole } from "./rbac";

const APPROVAL_ROLES: UserRole[] = ["SUPER_ADMIN", "PROPERTY_ADMIN", "OFFICE_STAFF"];

export function canApproveInvitation(status: string, userRole: string): boolean {
  return status === "PENDING" && APPROVAL_ROLES.includes(userRole as UserRole);
}

export function canRejectInvitation(status: string, userRole: string): boolean {
  return status === "PENDING" && APPROVAL_ROLES.includes(userRole as UserRole);
}

export function canGenerateQr(
  invitationStatus: string,
  hasExistingQr: boolean,
  userRole: string,
): boolean {
  if (invitationStatus !== "APPROVED") return false;
  if (hasExistingQr) return false;
  const allowed: UserRole[] = ["SUPER_ADMIN", "PROPERTY_ADMIN", "OFFICE_STAFF", "SECURITY_GUARD"];
  return allowed.includes(userRole as UserRole);
}

export function canViewInvitation(
  user: SafeUser,
  invitation: { invited_by: string; property_id: string },
): boolean {
  // RESIDENT can only view own invitations
  if (user.role === "RESIDENT" && invitation.invited_by !== user.id) return false;
  // Others must have property access (checked separately by requirePropertyAccess)
  return true;
}

export function canUpdateInvitation(
  invitationStatus: string,
  user: SafeUser,
  invitation: { invited_by: string },
): boolean {
  if (invitationStatus !== "PENDING") return false;
  // RESIDENT can only update own invitations
  if (user.role === "RESIDENT" && invitation.invited_by !== user.id) return false;
  return true;
}

export function canDeleteInvitation(user: SafeUser, invitation: { invited_by: string }): boolean {
  // RESIDENT can only delete own invitations
  if (user.role === "RESIDENT" && invitation.invited_by !== user.id) return false;
  return true;
}

export function isStaleInvitation(status: string, expectedDate: string | Date): boolean {
  if (status !== "PENDING") return false;
  return new Date(expectedDate) < new Date();
}

/**
 * Returns invitations that should be expired.
 * Pure function — does not mutate the database.
 */
export function filterStaleInvitations<T extends { status: string; expected_date: string | Date }>(
  invitations: T[],
): T[] {
  return invitations.filter((inv) => isStaleInvitation(inv.status, inv.expected_date));
}
