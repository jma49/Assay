"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Phase = "idle" | "loading" | "done";

/**
 * A 2px line along the bottom of the header while the next page loads.
 * It starts on a click of an internal link and completes when the path changes.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      setPhase("loading");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    setPhase((current) => (current === "loading" ? "done" : current));
  }, [pathname]);

  useEffect(() => {
    if (phase !== "done") return;
    const timer = setTimeout(() => setPhase("idle"), 400);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "idle") return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-px h-0.5 overflow-hidden">
      <div
        className="h-full origin-left bg-foreground/70"
        style={
          phase === "loading"
            ? { animation: "nav-progress 6s cubic-bezier(0.1, 0.7, 0.2, 1) forwards" }
            : { transform: "scaleX(1)", opacity: 0, transition: "transform 200ms ease-out, opacity 300ms ease 150ms" }
        }
      />
    </div>
  );
}
