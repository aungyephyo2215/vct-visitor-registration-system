import type { SafeUser } from "./types";
import { forbiddenResponse } from "./api-response";

export type UserRole =
  "SUPER_ADMIN" | "PROPERTY_ADMIN" | "SECURITY_GUARD" | "RESIDENT" | "OFFICE_STAFF";

export function requireRole(user: SafeUser, ...roles: UserRole[]): void {
  if (!roles.includes(user.role as UserRole)) {
    throw forbiddenResponse(`Requires one of roles: ${roles.join(", ")}`);
  }
}

export function canAccessProperty(user: SafeUser, propertyId: string): boolean {
  if (user.role === "SUPER_ADMIN") return true;
  return user.property_id === propertyId;
}

export function requirePropertyAccess(user: SafeUser, propertyId: string): void {
  if (!canAccessProperty(user, propertyId)) {
    throw forbiddenResponse("No access to this property");
  }
}
