"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { RowAMark } from "@/components/brand/RowAMark";
import { MARK } from "@/lib/brand/mark";
import type { LandingCopy } from "../content";
import { gsap, MOTION, useGSAP } from "../motion";
import { Magnetic } from "./Magnetic";

export function FinalCta({ copy, demoHref }: { copy: LandingCopy["cta"]; demoHref: string }) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ full: MOTION.full, reduced: MOTION.reduced }, (ctx) => {
        const full = ctx.conditions?.full;
        // The cut sweeps through the A, staying where it still splits it into a top and two legs.
        if (full) gsap.fromTo("[data-cta-cut]", { attr: { y: MARK.cutTravel.to } }, { attr: { y: MARK.cutTravel.from }, duration: 1.4, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.from("[data-cta-title]", { y: full ? 60 : 0, opacity: 0, duration: 1.1, ease: "power3.out", scrollTrigger: { trigger: scope.current, start: "top 70%" } });
      });
    },
    { scope },
  );

  return (
    <section ref={scope} className="grain relative isolate overflow-hidden bg-night py-28 text-center md:py-40">
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[38%] h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/40 blur-[120px]" />
      </div>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto size-32 text-night-foreground drop-shadow-[0_30px_60px_color-mix(in_srgb,var(--primary)_55%,transparent)] md:size-40">
          <RowAMark className="size-full" cutProps={{ "data-cta-cut": "" } as React.SVGProps<SVGRectElement>} />
        </div>
        <h2 data-cta-title className="mt-14 text-display-lg text-night-foreground sm:text-display-xl lg:text-display-2xl">
          {copy.titleTop}
          <br className="hidden sm:block" /> {copy.titleBottom}
        </h2>
        <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Magnetic>
            <Link href={demoHref} prefetch={false} className="inline-flex h-14 items-center gap-2 rounded-full bg-night-foreground px-8 text-title-sm font-medium text-night">
              {copy.primary}
              <ArrowRight className="size-4" />
            </Link>
          </Magnetic>
          <Magnetic>
            <a href="#self-host" className="inline-flex h-14 items-center rounded-full border border-night-foreground/15 px-8 text-title-sm font-medium text-night-foreground hover:bg-night-foreground/10">
              {copy.secondary}
            </a>
          </Magnetic>
        </div>
      </div>
    </section>
  );
}
