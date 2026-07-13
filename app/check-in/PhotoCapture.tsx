"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, RotateCcw, Upload } from "lucide-react";
import toast from "react-hot-toast";
import SignedImage from "@/components/SignedImage";
import { uploadCheckInPhoto } from "./checkin-client";

// The photo only needs to be recognizable, so we downscale hard and JPEG-encode
// before upload — this keeps stored files to a few tens of KB.
const MAX_DIMENSION = 640;
const JPEG_QUALITY = 0.72;

/** Draws a video frame or image onto a downscaled canvas and JPEG-encodes it. */
function compress(
  source: HTMLVideoElement | HTMLImageElement,
  srcW: number,
  srcH: number
): Promise<Blob> {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas not supported"));
  ctx.drawImage(source, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encode failed"))),
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

/**
 * Camera capture for the "Take Picture" step. Streams the device camera, snaps a
 * frame, compresses it client-side and uploads it for the given hacker. Falls
 * back to a file input (which opens the camera on mobile) if the live stream is
 * unavailable. The step itself is skippable from the flow controls.
 */
export function PhotoCapture({
  uid,
  onUploaded,
}: {
  uid: string;
  onUploaded: (url: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ blob: Blob; url: string } | null>(
    null
  );
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  // Callback ref: re-binds the live stream whenever the <video> (re)mounts, e.g.
  // after a Retake. The async start effect below covers the initial attach.
  const attachVideo = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch(() => {});
    }
  }, []);

  // Start the camera on mount; stop all tracks on unmount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        if (!cancelled)
          setCameraError(
            "Camera unavailable — use the file picker below instead."
          );
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Revoke the preview object URL when it changes / on unmount.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  const setPreviewBlob = (blob: Blob) => {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { blob, url: URL.createObjectURL(blob) };
    });
  };

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    try {
      const blob = await compress(video, video.videoWidth, video.videoHeight);
      setPreviewBlob(blob);
    } catch {
      toast.error("Couldn't capture the frame. Try again.");
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const src = URL.createObjectURL(file);
    try {
      const img = await loadImage(src);
      const blob = await compress(img, img.naturalWidth, img.naturalHeight);
      setPreviewBlob(blob);
    } catch {
      toast.error("Couldn't read that image. Try another.");
    } finally {
      URL.revokeObjectURL(src);
      e.target.value = ""; // allow re-selecting the same file
    }
  };

  const handleUpload = async () => {
    if (!preview) return;
    setUploading(true);
    const res = await uploadCheckInPhoto(uid, preview.blob);
    setUploading(false);
    if (!res.ok) {
      toast.error(res.reason);
      return;
    }
    setUploadedUrl(res.url);
    onUploaded(res.url);
    toast.success("Photo uploaded");
  };

  const retake = () => {
    setUploadedUrl(null);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  };

  // Uploaded — show the stored photo with an option to redo.
  if (uploadedUrl) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-emerald-300">
          <Check className="h-4 w-4" />
          Photo saved
        </div>
        {/* The stored object is private, so preview it via a signed URL. */}
        <SignedImage
          src={uploadedUrl}
          alt="Check-in"
          className="h-64 w-64 overflow-hidden rounded-xl border border-white/10"
        />
        <button
          type="button"
          onClick={retake}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10"
        >
          <RotateCcw className="h-4 w-4" />
          Retake
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-black">
        {/* Keep the video mounted so its stream survives a Retake; overlay the
            captured frame while previewing. */}
        <video
          ref={attachVideo}
          playsInline
          muted
          className="h-full w-full object-cover"
        />
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview.url}
            alt="Preview"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </div>

      {cameraError && (
        <p className="text-center text-xs text-amber-300/80">{cameraError}</p>
      )}

      {preview ? (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={retake}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Retake
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#874ffe] px-4 py-2 text-sm font-medium text-white hover:bg-[#7440e0] disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? "Uploading…" : "Use photo"}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          {!cameraError && (
            <button
              type="button"
              onClick={handleCapture}
              className="inline-flex items-center gap-2 rounded-lg bg-[#874ffe] px-4 py-2 text-sm font-medium text-white hover:bg-[#7440e0]"
            >
              <Camera className="h-4 w-4" />
              Capture
            </button>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10">
            <Upload className="h-4 w-4" />
            {cameraError ? "Choose / take photo" : "Upload file"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              className="hidden"
            />
          </label>
        </div>
      )}
    </div>
  );
}
