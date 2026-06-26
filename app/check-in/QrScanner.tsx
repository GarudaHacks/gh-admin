"use client";

import { useState } from "react";
import { Scanner, IDetectedBarcode } from "@yudiel/react-qr-scanner";

interface QrScannerProps {
  /** Fired once per decoded code. Parent decides what to do with the string. */
  onScan: (value: string) => void;
  /** Pause decoding (e.g. while a result is being shown). */
  paused?: boolean;
}

/**
 * Camera QR scanner that works on both mobile and laptop.
 *
 * Notes:
 * - The browser only grants camera access over HTTPS or on localhost.
 * - On phones it defaults to the rear ("environment") camera.
 */
export default function QrScanner({ onScan, paused = false }: QrScannerProps) {
  const [error, setError] = useState<string | null>(null);

  const handleScan = (codes: IDetectedBarcode[]) => {
    const value = codes[0]?.rawValue;
    if (value) onScan(value);
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black">
        <Scanner
          onScan={handleScan}
          onError={(e) =>
            setError(e instanceof Error ? e.message : "Unable to access the camera.")
          }
          paused={paused}
          constraints={{ facingMode: "environment" }}
          formats={["qr_code"]}
          scanDelay={400}
          components={{ finder: true }}
          styles={{ container: { width: "100%", height: "100%" } }}
        />
      </div>
      {error && (
        <p className="mt-2 text-center text-sm text-red-400">
          {error} — allow camera access and make sure the page is served over HTTPS.
        </p>
      )}
    </div>
  );
}
