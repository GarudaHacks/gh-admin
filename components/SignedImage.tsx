"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { getSignedFileUrl } from "@/lib/fileAccess";

/**
 * Renders a private Storage object (check-in photo, resume image, …) by lazily
 * minting a short-lived signed URL only once the element scrolls into view.
 * `src` may be a raw object path or a stored `storage.googleapis.com/...` URL —
 * signing goes through /api/file-url (admin only), so the plain private URL that
 * the check-in upload stores works here without being public.
 *
 * When `enableLightbox` is set, the thumbnail becomes clickable and opens a
 * full-screen overlay showing the full photo (Esc or a click outside closes it).
 */
export default function SignedImage({
  src,
  alt,
  className = "",
  imgClassName = "h-full w-full object-cover",
  enableLightbox = false,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  enableLightbox?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Only start signing once the thumbnail is near the viewport.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setErrored(false);
    getSignedFileUrl(src)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setErrored(true);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, src]);

  // Close the lightbox on Escape and lock body scroll while it's open.
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxOpen]);

  const canOpen = enableLightbox && !!url && !errored;

  return (
    <>
      <div ref={ref} className={className}>
        {url && !errored ? (
          canOpen ? (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="h-full w-full cursor-zoom-in"
              aria-label={`View full photo of ${alt}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={alt}
                className={imgClassName}
                onError={() => setErrored(true)}
              />
            </button>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={alt}
              className={imgClassName}
              onError={() => setErrored(true)}
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/5 text-[10px] text-white/40">
            {errored ? "No image" : "…"}
          </div>
        )}
      </div>

      {lightboxOpen && url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Full photo of ${alt}`}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 rounded-full border border-white/20 bg-white/10 p-2 text-white/80 hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={alt}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
