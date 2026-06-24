import type { VisitStatus } from "@/generated/prisma/enums";

/**
 * Allowed visit status transitions.
 * Terminal statuses (CHECKED_OUT, NO_SHOW, CANCELLED) have no outgoing transitions.
 */
const ALLOWED_TRANSITIONS: Record<VisitStatus, VisitStatus[]> = {
  EXPECTED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["CHECKED_OUT", "CANCELLED"],
  CHECKED_OUT: [],
  NO_SHOW: [],
  CANCELLED: [],
};

/**
 * Check whether a visit status transition is valid.
 *
 * @param currentStatus - The current status of the visit
 * @param targetStatus  - The desired new status
 * @returns true if the transition is allowed, false otherwise
 */
export function isValidTransition(currentStatus: VisitStatus, targetStatus: VisitStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(targetStatus);
}

/**
 * Get the list of allowed target statuses for a given current status.
 *
 * @param currentStatus - The current status of the visit
 * @returns Array of allowed target statuses (empty if terminal)
 */
export function getAllowedTransitions(currentStatus: VisitStatus): VisitStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus] ?? [];
}
