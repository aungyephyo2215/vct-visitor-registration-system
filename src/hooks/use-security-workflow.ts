"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import type { VisitData, VerificationData } from "@/types/security-workflow";

interface UseSecurityWorkflowOptions {
  token: string;
  onCheckInSuccess?: () => void;
  onCheckOutSuccess?: () => void;
}

interface UseSecurityWorkflowReturn {
  // State
  visitData: VisitData | null;
  existingVerification: VerificationData | null;
  loading: boolean;
  error: string | null;

  // Derived
  isExpired: boolean;
  isQrActive: boolean;
  hasVisitor: boolean;
  hasVerification: boolean;
  visitStatus: string | null;
  isExpected: boolean;
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  isCancelled: boolean;
  needsVerification: boolean;
  needsCheckIn: boolean;
  needsCheckOut: boolean;

  // Actions
  lookup: () => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  verify: (payload: any) => Promise<VerificationData | null>;
  checkIn: () => Promise<boolean>;
  checkOut: () => Promise<boolean>;
  refresh: () => Promise<void>;
  reset: () => void;
}

/**
 * Shared hook for the Security Gate workflow.
 *
 * Provides a single source of truth for:
 * - QR token lookup
 * - Visitor verification
 * - Check-in / Check-out
 * - State management
 *
 * Designed to be migrated from `token` to `workflowId` in the future
 * without changing the consuming pages.
 */
export function useSecurityWorkflow({
  token,
  onCheckInSuccess,
  onCheckOutSuccess,
}: UseSecurityWorkflowOptions): UseSecurityWorkflowReturn {
  const [visitData, setVisitData] = useState<VisitData | null>(null);
  const [existingVerification, setExistingVerification] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Derived state ────────────────────────────────────

  const visitStatus = visitData?.visit.status ?? null;
  const isExpired = visitData ? new Date(visitData.qr.expires_at) < new Date() : false;
  const isQrActive = visitData?.qr.status === "ACTIVE" && !isExpired;
  const hasVisitor = !!visitData?.visit.visitor;
  const hasVerification = !!existingVerification;
  const isExpected = visitStatus === "EXPECTED";
  const isCheckedIn = visitStatus === "CHECKED_IN";
  const isCheckedOut = visitStatus === "CHECKED_OUT";
  const isCancelled = visitStatus === "CANCELLED";
  const needsVerification = isExpected && !hasVerification;
  const needsCheckIn = isExpected && hasVerification && hasVisitor;
  const needsCheckOut = isCheckedIn;

  // ─── Internal helpers ─────────────────────────────────

  const fetchVerification = useCallback(
    async (visitId: string): Promise<VerificationData | null> => {
      try {
        return await api.get<VerificationData>(`/api/v1/visits/${visitId}/verification`);
      } catch {
        return null;
      }
    },
    [],
  );

  const fetchVisitData = useCallback(async (qrToken: string): Promise<VisitData> => {
    return api.get<VisitData>("/api/v1/qr/lookup", { token: qrToken });
  }, []);

  // ─── Actions ──────────────────────────────────────────

  const lookup = useCallback(async () => {
    if (!token.trim()) return;

    setLoading(true);
    setError(null);
    setVisitData(null);
    setExistingVerification(null);

    try {
      const data = await fetchVisitData(token.trim());
      setVisitData(data);

      // Check for existing verification
      const verification = await fetchVerification(data.visit.id);
      setExistingVerification(verification);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid QR code");
    } finally {
      setLoading(false);
    }
  }, [token, fetchVisitData, fetchVerification]);

  const verify = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (payload: any): Promise<VerificationData | null> => {
      if (!visitData) return null;

      setLoading(true);
      setError(null);

      try {
        const verification = await api.post<VerificationData>(
          `/api/v1/visits/${visitData.visit.id}/verification`,
          payload,
        );
        setExistingVerification(verification);
        return verification;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Verification failed");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [visitData],
  );

  const checkIn = useCallback(async (): Promise<boolean> => {
    if (!token.trim()) return false;

    setLoading(true);
    setError(null);

    try {
      await api.post("/api/v1/checkin", { token: token.trim() });
      // Refresh visit data
      const data = await fetchVisitData(token.trim());
      setVisitData(data);
      onCheckInSuccess?.();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-in failed");
      return false;
    } finally {
      setLoading(false);
    }
  }, [token, fetchVisitData, onCheckInSuccess]);

  const checkOut = useCallback(async (): Promise<boolean> => {
    if (!token.trim()) return false;

    setLoading(true);
    setError(null);

    try {
      await api.post("/api/v1/checkout/qr", { token: token.trim() });
      // Refresh visit data
      const data = await fetchVisitData(token.trim());
      setVisitData(data);
      onCheckOutSuccess?.();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-out failed");
      return false;
    } finally {
      setLoading(false);
    }
  }, [token, fetchVisitData, onCheckOutSuccess]);

  const refresh = useCallback(async () => {
    if (!token.trim()) return;

    try {
      const data = await fetchVisitData(token.trim());
      setVisitData(data);
      const verification = await fetchVerification(data.visit.id);
      setExistingVerification(verification);
    } catch {
      // Silent fail on refresh
    }
  }, [token, fetchVisitData, fetchVerification]);

  const reset = useCallback(() => {
    setVisitData(null);
    setExistingVerification(null);
    setLoading(false);
    setError(null);
  }, []);

  return {
    // State
    visitData,
    existingVerification,
    loading,
    error,

    // Derived
    isExpired,
    isQrActive,
    hasVisitor,
    hasVerification,
    visitStatus,
    isExpected,
    isCheckedIn,
    isCheckedOut,
    isCancelled,
    needsVerification,
    needsCheckIn,
    needsCheckOut,

    // Actions
    lookup,
    verify,
    checkIn,
    checkOut,
    refresh,
    reset,
  };
}
