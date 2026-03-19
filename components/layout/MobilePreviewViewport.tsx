"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

// iPhone 14 Pro Max viewport
const MOBILE_VIEWPORT = "width=430, initial-scale=1, viewport-fit=cover";

/**
 * When the store is loaded in the theme editor iframe with ?preview=mobile,
 * force viewport to 430px (iPhone 14 Pro Max) so the store renders as mobile.
 */
export function MobilePreviewViewport() {
  const searchParams = useSearchParams();
  const isMobilePreview = searchParams.get("preview") === "mobile";

  useEffect(() => {
    if (!isMobilePreview || typeof document === "undefined") return;

    let meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "viewport";
      document.head.appendChild(meta);
    }
    const previous = meta.getAttribute("content") || "";
    meta.setAttribute("content", MOBILE_VIEWPORT);

    return () => {
      meta?.setAttribute("content", previous || "width=device-width, initial-scale=1, viewport-fit=cover");
    };
  }, [isMobilePreview]);

  return null;
}
