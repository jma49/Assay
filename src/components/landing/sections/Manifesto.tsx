"use client";

import { Fragment, useRef } from "react";
import { cn } from "@/lib/utils/utils";
import type { LandingCopy, ManifestoPart } from "../content";
import { gsap, useGSAP } from "../motion";

const STRIP = "cccciicciiiiibb";
const STRIP_CELL: Record<string, string> = { c: "bg-night-success", i: "bg-night-attention", b: "bg-night-failure" };

function Mark({ part }: { part: Exclude<ManifestoPart, string> }) {
  if (part.mark === "strip") {
    return (
      <span aria-hidden className="mx-[0.1em] inline-flex h-[0.8em] items-center gap-[0.07em] rounded-full border border-night-foreground/10 bg-night-foreground/[.06] px-[0.25em] align-middle">
        {STRIP.split("").map((s, i) => (
          <span key={i} className={cn("h-[0.42em] w-[0.09em] rounded-full", STRIP_CELL[s])} />
        ))}
      </span>
    );
  }
  const tone = part.mark === "rows" ? "bg-night-attention/15 text-night-attention" : "bg-night-failure/15 text-night-failure";
  const dot = part.mark === "rows" ? "bg-night-attention" : "bg-night-failure";
  return (
    <span className={cn("mx-[0.1em] inline-flex h-[0.95em] items-center gap-2 rounded-full px-[0.35em] align-middle manifesto-pill font-medium", tone)}>
      <span className={cn("size-2 rounded-full", dot)} />
      {part.label}
    </span>
  );
}

/** The manifesto brightens word by word as it scrolls through the viewport (opacity only). */
export function Manifesto({ parts }: { parts: LandingCopy["manifesto"] }) {
  const scope = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      gsap.fromTo("[data-word]", { opacity: 0.12 }, { opacity: 1, stagger: 0.08, ease: "none", scrollTrigger: { trigger: scope.current, start: "top 78%", end: "bottom 42%", scrub: true } });
    },
    { scope, dependencies: [parts] },
  );

  return (
    <section className="relative bg-night py-24 md:py-36">
      <div aria-hidden className="absolute left-1/2 top-1/2 h-[480px] w-[900px] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <p ref={scope} className="font-display text-display-sm text-night-foreground sm:text-display-md lg:text-display-xl">
          {parts.map((part, i) =>
            typeof part === "string" ? (
              <Fragment key={i}>
                {part.split(/(\s+)/).map((w, k) => (w.trim() ? <span key={k} data-word>{w}</span> : w))}{" "}
              </Fragment>
            ) : (
              <Fragment key={i}>
                <span data-word><Mark part={part} /></span>{" "}
              </Fragment>
            ),
          )}
        </p>
      </div>
    </section>
  );
}
