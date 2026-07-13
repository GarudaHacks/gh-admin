"use client";

import { useEffect, useRef, useState } from "react";
import { getSignedFileUrl } from "@/lib/fileAccess";

/**
 * Renders a private Storage object (check-in photo, resume image, …) by lazily
 * minting a short-lived signed URL only once the element scrolls into view.
 * `src` may be a raw object path or a stored `storage.googleapis.com/...` URL —
 * signing goes through /api/file-url (admin only), so the plain private URL that
 * the check-in upload stores works here without being public.
 */
export default function SignedImage({
  src,
  alt,
  className = "",
  imgClassName = "h-full w-full object-cover",
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);

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

  return (
    <div ref={ref} className={className}>
      {url && !errored ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt}
          className={imgClassName}
          onError={() => setErrored(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-white/5 text-[10px] text-white/40">
          {errored ? "No image" : "…"}
        </div>
      )}
    </div>
  );
}
