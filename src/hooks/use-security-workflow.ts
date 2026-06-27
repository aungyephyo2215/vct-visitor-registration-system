"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import type {
  GateWorkflowStatus,
  VerificationData,
  VerificationFormPayload,
  VisitData,
} from "@/types/security-workflow";

interface UseSecurityWorkflowOptions {
  onCheckInSuccess?: () => void;
  onCheckOutSuccess?: () => void;
}

interface UseSecurityWorkflowReturn {
  currentVisit: VisitData | null;
  currentStatus: GateWorkflowStatus;
  activeToken: string;
  existingVerification: VerificationData | null;
  loading: boolean;
  error: string | null;
  lastLookupFailed: boolean;
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
  lookup: (token: string) => Promise<boolean>;
  verify: (payload: VerificationFormPayload) => Promise<VerificationData | null>;
  checkIn: () => Promise<boolean>;
  checkOut: () => Promise<boolean>;
  refresh: () => Promise<void>;
  reset: () => void;
}

function normalizeErrorMessage(message: string): GateWorkflowStatus {
  const normalized = message.toLowerCase();

  if (normalized.includes("blocked")) {
    return {
      kind: "blocked",
      tone: "destructive",
      title: "Blocked visitor",
      description:
        "This visitor matches an active blocklist entry. Contact the property admin before continuing.",
      primaryAction: { type: "none", label: "Blocked" },
    };
  }

  if (normalized.includes("expired")) {
    return {
      kind: "expired",
      tone: "warning",
      title: "Expired QR code",
      description:
        "This QR code is no longer valid. Ask the host or office team to generate a new access QR.",
      primaryAction: { type: "none", label: "Expired" },
    };
  }

  if (normalized.includes("already checked in") || normalized.includes("visit is checked_in")) {
    return {
      kind: "currently_inside",
      tone: "warning",
      title: "Visitor is currently inside",
      description:
        "This visitor is already checked in. Review the visit summary below and check them out when they leave.",
      primaryAction: { type: "checkout", label: "Check Out Visitor" },
    };
  }

  if (normalized.includes("already checked out")) {
    return {
      kind: "completed",
      tone: "muted",
      title: "Visit already completed",
      description:
        "This visitor has already been checked out. The record is read-only from the gate workflow.",
      primaryAction: { type: "none", label: "Completed" },
    };
  }

  if (normalized.includes("cancelled")) {
    return {
      kind: "cancelled",
      tone: "destructive",
      title: "Visit cancelled",
      description: "This visit has been cancelled and should not proceed through the gate.",
      primaryAction: { type: "none", label: "Cancelled" },
    };
  }

  if (
    normalized.includes("invalid qr") ||
    normalized.includes("not found") ||
    normalized.includes("invalid")
  ) {
    return {
      kind: "invalid",
      tone: "destructive",
      title: "Invalid QR code",
      description:
        "We couldn't match this QR to an active gate workflow. Rescan the code or use manual entry as a fallback.",
      primaryAction: { type: "none", label: "Invalid" },
    };
  }

  return {
    kind: "error",
    tone: "destructive",
    title: "Unable to continue",
    description: message,
    primaryAction: { type: "none", label: "Retry" },
  };
}

function deriveWorkflowStatus(params: {
  loading: boolean;
  error: string | null;
  visitData: VisitData | null;
  hasVerification: boolean;
  isExpired: boolean;
  isQrActive: boolean;
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  isCancelled: boolean;
}): GateWorkflowStatus {
  const {
    loading,
    error,
    visitData,
    hasVerification,
    isExpired,
    isQrActive,
    isCheckedIn,
    isCheckedOut,
    isCancelled,
  } = params;

  if (loading) {
    return {
      kind: "loading",
      tone: "default",
      title: "Validating QR code",
      description: "Looking up the visitor and preparing the correct gate action.",
      primaryAction: { type: "none", label: "Processing" },
    };
  }

  if (error) return normalizeErrorMessage(error);

  if (!visitData) {
    return {
      kind: "idle",
      tone: "default",
      title: "Ready to scan",
      description: "Camera is ready. Scan the visitor QR to begin the gate workflow.",
      primaryAction: { type: "none", label: "Scan QR" },
    };
  }

  if (isCancelled) {
    return {
      kind: "cancelled",
      tone: "destructive",
      title: "Visit cancelled",
      description: "This visit has been cancelled and cannot continue through gate operations.",
      primaryAction: { type: "none", label: "Cancelled" },
    };
  }

  if (isCheckedOut) {
    return {
      kind: "completed",
      tone: "muted",
      title: "Visit completed",
      description:
        "The visitor has already been checked out. Use View Full Details for audit or history.",
      primaryAction: { type: "none", label: "Completed" },
    };
  }

  if (isCheckedIn) {
    return {
      kind: "currently_inside",
      tone: "warning",
      title: "Visitor is currently inside",
      description:
        "This visitor is already checked in. Use the primary action below when they leave the property.",
      primaryAction: { type: "checkout", label: "Check Out Visitor" },
    };
  }

  if (isExpired || !isQrActive) {
    return {
      kind: "expired",
      tone: "warning",
      title: "QR unavailable for gate action",
      description:
        "This QR is no longer active for check-in. Ask the host or office team to issue a new QR code.",
      primaryAction: { type: "none", label: "Unavailable" },
    };
  }

  if (!hasVerification) {
    return {
      kind: "ready_for_verification",
      tone: "default",
      title: "Verification required",
      description: "Verify the visitor inline, then the page will immediately offer check-in.",
      primaryAction: { type: "verify", label: "Verify Visitor" },
    };
  }

  return {
    kind: "ready_for_checkin",
    tone: "success",
    title: "Ready for check-in",
    description: "Verification is complete. Use the primary action to check the visitor in now.",
    primaryAction: { type: "checkin", label: "Check In Visitor" },
  };
}

export function useSecurityWorkflow({
  onCheckInSuccess,
  onCheckOutSuccess,
}: UseSecurityWorkflowOptions = {}): UseSecurityWorkflowReturn {
  const [activeToken, setActiveToken] = useState("");
  const [visitData, setVisitData] = useState<VisitData | null>(null);
  const [existingVerification, setExistingVerification] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLookupFailed, setLastLookupFailed] = useState(false);

  const visitStatus = visitData?.visit.status ?? null;
  const isExpired = visitData ? new Date(visitData.qr.expires_at) < new Date() : false;
  const isQrActive = visitData?.qr.status === "ACTIVE" && !isExpired;
  const hasVisitor = !!visitData?.visit.visitor;
  const hasVerification = !!existingVerification || !!visitData?.visit.verification;
  const isExpected = visitStatus === "EXPECTED";
  const isCheckedIn = visitStatus === "CHECKED_IN";
  const isCheckedOut = visitStatus === "CHECKED_OUT";
  const isCancelled = visitStatus === "CANCELLED";
  const needsVerification = isExpected && !hasVerification;
  const needsCheckIn = isExpected && hasVerification && hasVisitor && isQrActive;
  const needsCheckOut = isCheckedIn;

  const fetchVisitData = async (qrToken: string): Promise<VisitData> => {
    return api.get<VisitData>("/api/v1/qr/lookup", { token: qrToken });
  };

  const fetchVerification = async (visitId: string): Promise<VerificationData | null> => {
    try {
      return await api.get<VerificationData>(`/api/v1/visits/${visitId}/verification`);
    } catch {
      return null;
    }
  };

  const refreshVisitState = async (token = activeToken) => {
    if (!token.trim()) return;

    const data = await fetchVisitData(token.trim());
    setVisitData(data);
    const verification = await fetchVerification(data.visit.id);
    setExistingVerification(verification);
  };

  const lookup = async (token: string): Promise<boolean> => {
    const nextToken = token.trim();
    if (!nextToken) {
      setError("QR token is required");
      setLastLookupFailed(true);
      return false;
    }

    setActiveToken(nextToken);
    setLoading(true);
    setError(null);
    setVisitData(null);
    setExistingVerification(null);
    setLastLookupFailed(false);

    try {
      const data = await fetchVisitData(nextToken);
      setVisitData(data);
      const verification = await fetchVerification(data.visit.id);
      setExistingVerification(verification);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid QR code");
      setLastLookupFailed(true);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const verify = async (payload: VerificationFormPayload): Promise<VerificationData | null> => {
    if (!visitData) return null;

    setLoading(true);
    setError(null);

    try {
      const verification = existingVerification
        ? await api.patch<VerificationData>(
            `/api/v1/visits/${visitData.visit.id}/verification`,
            payload,
          )
        : await api.post<VerificationData>(
            `/api/v1/visits/${visitData.visit.id}/verification`,
            payload,
          );

      setExistingVerification(verification);
      await refreshVisitState();
      return verification;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const checkIn = async (): Promise<boolean> => {
    if (!activeToken.trim()) return false;

    setLoading(true);
    setError(null);

    try {
      await api.post("/api/v1/checkin", { token: activeToken.trim() });
      await refreshVisitState();
      onCheckInSuccess?.();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-in failed");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const checkOut = async (): Promise<boolean> => {
    if (!activeToken.trim()) return false;

    setLoading(true);
    setError(null);

    try {
      await api.post("/api/v1/checkout/qr", { token: activeToken.trim() });
      await refreshVisitState();
      onCheckOutSuccess?.();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-out failed");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    try {
      await refreshVisitState();
    } catch {
      // ignore silent refresh errors
    }
  };

  const reset = () => {
    setActiveToken("");
    setVisitData(null);
    setExistingVerification(null);
    setLoading(false);
    setError(null);
    setLastLookupFailed(false);
  };

  const currentStatus = useMemo(
    () =>
      deriveWorkflowStatus({
        loading,
        error,
        visitData,
        hasVerification,
        isExpired,
        isQrActive,
        isCheckedIn,
        isCheckedOut,
        isCancelled,
      }),
    [
      error,
      hasVerification,
      isCancelled,
      isCheckedIn,
      isCheckedOut,
      isExpired,
      isQrActive,
      loading,
      visitData,
    ],
  );

  return {
    currentVisit: visitData,
    currentStatus,
    activeToken,
    existingVerification,
    loading,
    error,
    lastLookupFailed,
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
    lookup,
    verify,
    checkIn,
    checkOut,
    refresh,
    reset,
  };
}
