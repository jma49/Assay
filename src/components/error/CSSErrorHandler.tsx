"use client";

import { useEffect } from "react";

export default function CSSErrorHandler() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const processedUrls = new Set<string>();
    let isHandling = false;

    const handleCSSError = (event: Event) => {
      if (isHandling) return false;

      const target = event.target as HTMLLinkElement;

      if (target && target.tagName === "LINK" && target.rel === "stylesheet") {
        const url = target.href;

        if (
          url.includes("/layout.css") ||
          url.includes("/_next/static/css/app/layout.css")
        ) {
          if (processedUrls.has(url)) {
            event.preventDefault();
            event.stopPropagation();
            return false;
          }

          processedUrls.add(url);
          isHandling = true;

          console.warn(`Suppressed CSS 404: ${url}`);

          if (target.parentNode) {
            target.parentNode.removeChild(target);
          }

          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          setTimeout(() => {
            isHandling = false;
          }, 100);

          return false;
        }
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      if (
        error &&
        typeof error === "object" &&
        "name" in error &&
        "message" in error
      ) {
        const errorObj = error as {
          name: string;
          message: string;
          stack?: string;
        };
        if (
          errorObj.name === "ChunkLoadError" ||
          errorObj.message?.includes("CSS") ||
          errorObj.message?.includes("stylesheet") ||
          errorObj.message?.includes("_next/static/css")
        ) {
          console.warn("Suppressed CSS load error:", errorObj.message);
          event.preventDefault();
        }
      }
    };

    // Resource load errors do not bubble, so listen in the capture phase.
    document.addEventListener("error", handleCSSError, {
      capture: true,
      passive: false,
    });
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      document.removeEventListener("error", handleCSSError, true);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
      processedUrls.clear();
    };
  }, []);

  return null;
}
