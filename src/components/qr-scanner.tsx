"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Html5Qrcode, type CameraDevice } from "html5-qrcode";
import { AlertCircle, Camera, CameraOff, RefreshCw, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QrScannerProps {
  onScanResult: (token: string) => Promise<boolean> | boolean;
  paused?: boolean;
  autoStart?: boolean;
  processing?: boolean;
}

function pickDefaultCamera(cameras: CameraDevice[]) {
  return (
    cameras.find((camera) => /back|rear|environment/i.test(camera.label)) ?? cameras[0] ?? null
  );
}

async function playSuccessFeedback() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate?.(150);
  }

  if (typeof window === "undefined") return;

  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.06, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.18);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
    oscillator.onended = () => {
      void audioContext.close().catch(() => undefined);
    };
  } catch {
    // best effort only
  }
}

export function QrScanner({
  onScanResult,
  paused = false,
  autoStart = true,
  processing = false,
}: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = `qr-scanner-${useId()}`;
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [isPreparingCamera, setIsPreparingCamera] = useState(true);
  const [cameraDevices, setCameraDevices] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [lastDecodedText, setLastDecodedText] = useState("");
  const [isInternalProcessing, setIsInternalProcessing] = useState(false);
  const [resumeCameraId, setResumeCameraId] = useState<string | null>(null);
  const lastScanRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);

  const canSwitchCamera = cameraDevices.length > 1;
  const effectiveProcessing = processing || isInternalProcessing;

  const stopScanner = useCallback(async () => {
    if (!scannerRef.current) return;

    try {
      const state = scannerRef.current.getState();
      if (state === 2) {
        await scannerRef.current.stop();
      }
    } catch {
      // ignore stop failures
    } finally {
      setIsScanning(false);
    }
  }, []);

  const loadCameras = useCallback(async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      setCameraDevices(devices);
      if (devices.length === 0) {
        setHasCamera(false);
        setError("No camera found on this device. Use manual QR entry below.");
        return null;
      }

      const preferred = pickDefaultCamera(devices);
      setHasCamera(true);
      if (preferred) {
        setSelectedCameraId((current) => current ?? preferred.id);
      }
      return preferred?.id ?? null;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to access camera devices";
      setHasCamera(false);
      setError(message);
      return null;
    }
  }, []);

  const startScanner = useCallback(
    async (cameraIdOverride?: string) => {
      if (!scannerRef.current) return;

      const cameraId = cameraIdOverride ?? selectedCameraId;
      if (!cameraId || paused || effectiveProcessing) return;

      try {
        setIsPreparingCamera(true);
        setError(null);

        await scannerRef.current.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          async (decodedText) => {
            const now = Date.now();
            if (processing || isInternalProcessing) return;
            if (decodedText === lastScanRef.current && now - lastScanTimeRef.current < 3000) {
              return;
            }

            lastScanRef.current = decodedText;
            lastScanTimeRef.current = now;
            setLastDecodedText(decodedText);
            setIsInternalProcessing(true);

            await playSuccessFeedback();
            await stopScanner();

            try {
              const success = await onScanResult(decodedText);
              if (!success && !paused) {
                setResumeCameraId(cameraId);
              }
            } catch {
              if (!paused) {
                setResumeCameraId(cameraId);
              }
            } finally {
              setIsInternalProcessing(false);
            }
          },
          () => {
            // Ignore frame-level decode misses.
          },
        );

        setIsScanning(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to start camera";
        setError(message);
        setHasCamera(false);
      } finally {
        setIsPreparingCamera(false);
      }
    },
    [
      effectiveProcessing,
      isInternalProcessing,
      onScanResult,
      paused,
      processing,
      selectedCameraId,
      stopScanner,
    ],
  );

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    void (async () => {
      const detectedCameraId = await loadCameras();
      setIsPreparingCamera(false);

      if (autoStart && detectedCameraId && !paused) {
        await startScanner(detectedCameraId);
      }
    })();

    return () => {
      void stopScanner();
      scannerRef.current = null;
    };
  }, [autoStart, containerId, loadCameras, paused, startScanner, stopScanner]);

  useEffect(() => {
    if (paused) {
      void stopScanner();
      return;
    }

    if (resumeCameraId && !effectiveProcessing) {
      window.setTimeout(() => {
        void startScanner(resumeCameraId);
        setResumeCameraId(null);
      }, 0);
      return;
    }

    if (autoStart && selectedCameraId && !isScanning && !effectiveProcessing && hasCamera) {
      window.setTimeout(() => {
        void startScanner(selectedCameraId);
      }, 0);
    }
  }, [
    autoStart,
    effectiveProcessing,
    hasCamera,
    isScanning,
    paused,
    resumeCameraId,
    selectedCameraId,
    startScanner,
    stopScanner,
  ]);

  const cycleCamera = useCallback(async () => {
    if (cameraDevices.length < 2 || !selectedCameraId) return;

    const currentIndex = cameraDevices.findIndex((device) => device.id === selectedCameraId);
    const nextDevice = cameraDevices[(currentIndex + 1) % cameraDevices.length];
    setSelectedCameraId(nextDevice.id);

    if (isScanning) {
      await stopScanner();
      await startScanner(nextDevice.id);
    }
  }, [cameraDevices, isScanning, selectedCameraId, startScanner, stopScanner]);

  const cameraLabel = useMemo(() => {
    return (
      cameraDevices.find((device) => device.id === selectedCameraId)?.label || "Default camera"
    );
  }, [cameraDevices, selectedCameraId]);

  const handleToggle = async () => {
    if (isScanning) {
      await stopScanner();
    } else {
      await startScanner();
    }
  };

  return (
    <div className="space-y-4">
      <div
        className="relative mx-auto w-full max-w-sm overflow-hidden rounded-xl border bg-black"
        style={{ minHeight: 320 }}
      >
        <div id={containerId} className="min-h-[320px]" />

        {(isPreparingCamera || effectiveProcessing) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-white">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
            <div className="text-center">
              <div className="font-medium">
                {effectiveProcessing ? "Validating scan..." : "Preparing camera..."}
              </div>
              <div className="text-sm text-white/70">
                {effectiveProcessing
                  ? "Please hold while we load the gate workflow."
                  : "Allow camera access to start scanning automatically."}
              </div>
            </div>
          </div>
        )}
      </div>

      {lastDecodedText && effectiveProcessing && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Scan captured successfully. Processing visitor workflow now.
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-md px-3 py-2 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        {hasCamera ? (
          <>
            <Button
              onClick={handleToggle}
              variant={isScanning ? "outline" : "default"}
              size="lg"
              className="flex-1 sm:max-w-sm"
              disabled={effectiveProcessing || isPreparingCamera}
            >
              {isScanning ? (
                <>
                  <CameraOff className="mr-2 h-5 w-5" />
                  Stop Scanner
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-5 w-5" />
                  Start Scanner
                </>
              )}
            </Button>
            {canSwitchCamera && (
              <Button
                onClick={cycleCamera}
                variant="outline"
                size="lg"
                disabled={effectiveProcessing || isPreparingCamera}
              >
                <RefreshCw className="mr-2 h-5 w-5" />
                Switch Camera
              </Button>
            )}
          </>
        ) : (
          <div className="text-muted-foreground text-center text-sm">
            Camera not available. Use manual QR entry below.
          </div>
        )}
      </div>

      {hasCamera && (
        <div className="text-muted-foreground flex items-center justify-center gap-2 text-xs">
          <ScanLine className="h-3.5 w-3.5" />
          <span>{cameraLabel}</span>
        </div>
      )}
    </div>
  );
}
