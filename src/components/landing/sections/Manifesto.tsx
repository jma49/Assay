"use client";

import { Fragment, useRef } from "react";
import { cn } from "@/lib/utils/utils";
import type { LandingCopy, ManifestoPart } from "../content";
import { gsap, useGSAP } from "../motion";
import { INSET, Section } from "../ui";

const STRIP = "cccciicciiiiibb";
const STRIP_CELL: Record<string, string> = { c: "bg-success", i: "bg-attention", b: "bg-failure" };

function Mark({ part }: { part: Exclude<ManifestoPart, string> }) {
  if (part.mark === "strip") {
    return (
      <span aria-hidden className="mx-[0.1em] inline-flex h-[0.7em] items-center gap-[0.07em] border border-rule bg-paper-raised px-[0.25em] align-middle">
        {STRIP.split("").map((s, i) => (
          <span key={i} className={cn("h-[0.42em] w-[0.09em]", STRIP_CELL[s])} />
        ))}
      </span>
    );
  }
  const tone = part.mark === "rows" ? "bg-attention-soft text-attention" : "bg-failure-soft text-failure";
  const dot = part.mark === "rows" ? "bg-attention" : "bg-failure";
  return (
    <span className={cn("mx-[0.1em] inline-flex h-[0.8em] items-center gap-2 px-[0.4em] align-middle font-sans manifesto-pill font-medium not-italic", tone)}>
      <span className={cn("size-2 rounded-full", dot)} />
      {part.label}
    </span>
  );
}

/** The manifesto brightens word by word as it scrolls through the viewport (opacity only). */
export function Manifesto({ label, parts }: { label: string; parts: LandingCopy["manifesto"] }) {
  const scope = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      gsap.fromTo("[data-word]", { opacity: 0.12 }, { opacity: 1, stagger: 0.08, ease: "none", scrollTrigger: { trigger: scope.current, start: "top 78%", end: "bottom 42%", scrub: true } });
    },
    { scope, dependencies: [parts] },
  );

  return (
    <Section frameClassName={`${INSET} grid gap-8 py-20 md:grid-cols-12 md:py-28`}>
      <p className="eyebrow text-caption text-ink-muted md:col-span-3">{label}</p>
      <p ref={scope} className="font-editorial text-display-md text-ink sm:text-display-lg lg:text-display-xl md:col-span-9">
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
    </Section>
  );
}
