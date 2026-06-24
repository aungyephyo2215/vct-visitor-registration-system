"use client";

import { useEffect, useRef, useState, useCallback, useId } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QrScannerProps {
  onScanResult: (token: string) => void;
  paused?: boolean;
}

export function QrScanner({ onScanResult, paused = false }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = `qr-scanner-${useId()}`;
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const lastScanRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) {
          // SCANNING state
          await scannerRef.current.stop();
        }
      } catch {
        // Ignore stop errors
      }
      setIsScanning(false);
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (!scannerRef.current) return;

    try {
      setError(null);
      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          const now = Date.now();
          // Debounce: ignore same token within 3 seconds
          if (decodedText === lastScanRef.current && now - lastScanTimeRef.current < 3000) {
            return;
          }
          lastScanRef.current = decodedText;
          lastScanTimeRef.current = now;
          onScanResult(decodedText);
        },
        () => {
          // QR code scan failure (no code found in frame) — ignore
        },
      );
      setIsScanning(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start camera";
      setError(message);
      setHasCamera(false);
    }
  }, [onScanResult]);

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            scannerRef.current = null;
          });
      }
    };
  }, []);

  useEffect(() => {
    if (paused) {
      stopScanner();
    }
  }, [paused, stopScanner]);

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
        id={containerId}
        className="mx-auto w-full max-w-sm overflow-hidden rounded-lg border bg-black"
        style={{ minHeight: 280 }}
      />

      {error && (
        <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-md px-3 py-2 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-center">
        {hasCamera ? (
          <Button
            onClick={handleToggle}
            variant={isScanning ? "destructive" : "default"}
            size="lg"
            className="w-full max-w-sm"
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
        ) : (
          <div className="text-muted-foreground text-center text-sm">
            Camera not available. Use manual token entry below.
          </div>
        )}
      </div>
    </div>
  );
}
