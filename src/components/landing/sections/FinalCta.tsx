"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { RowAMark } from "@/components/brand/RowAMark";
import { MARK } from "@/lib/brand/mark";
import { cn } from "@/lib/utils/utils";
import type { LandingCopy } from "../content";
import { gsap, MOTION, useGSAP } from "../motion";
import { FRAME } from "../ui";

export function FinalCta({ copy, demoHref }: { copy: LandingCopy["cta"]; demoHref: string }) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ full: MOTION.full, reduced: MOTION.reduced }, (ctx) => {
        const full = ctx.conditions?.full;
        // The cut sweeps through the A, staying where it still splits it into a top and two legs.
        if (full) gsap.fromTo("[data-cta-cut]", { attr: { y: MARK.cutTravel.to } }, { attr: { y: MARK.cutTravel.from }, duration: 1.4, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.from("[data-cta-title]", { y: full ? 40 : 0, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: scope.current, start: "top 70%" } });
      });
    },
    { scope },
  );

  return (
    <section ref={scope} className="border-t border-rule">
      <div className={cn(FRAME, "ticks")}>
        <div aria-hidden className="hatch h-12 border-b border-rule md:h-16" />
        <div className="graph px-5 py-24 text-center md:py-32">
          <RowAMark className="mx-auto size-16 text-ink md:size-20" cutProps={{ "data-cta-cut": "" } as React.SVGProps<SVGRectElement>} />
          <h2 data-cta-title className="font-editorial mx-auto mt-10 max-w-4xl text-balance text-display-xl text-ink md:text-display-2xl">
            {copy.titleTop} <span className="italic text-primary">{copy.titleBottom}</span>
          </h2>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={demoHref} prefetch={false} className="group inline-flex h-11 items-center gap-2 rounded-md bg-ink px-5 text-body-md font-medium text-paper transition-opacity hover:opacity-85">
              {copy.primary}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#self-host" className="inline-flex h-11 items-center rounded-md border border-rule-strong bg-paper-raised px-5 text-body-md font-medium text-ink transition-colors hover:border-ink-muted">
              {copy.secondary}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
