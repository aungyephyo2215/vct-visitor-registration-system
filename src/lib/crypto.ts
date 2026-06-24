import { createHash } from "crypto";

/**
 * Hash a token using SHA-256 and return the hex digest.
 * Used for storing email access tokens as one-way hashes.
 *
 * @param token - The raw token string to hash
 * @returns The SHA-256 hex digest (64 lowercase hex characters)
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
