"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import type { LandingCopy } from "../content";
import { SCENARIO_META, SCENARIO_SQL } from "../data";
import { CONTAINER, NightOutcome } from "../ui";

/** The four problems planted in the demo, as slices that open sideways (stacked on phones). */
export function Scenarios({ copy, outcomeCopy, demoHref }: { copy: LandingCopy["scenarios"]; outcomeCopy: LandingCopy["outcome"]; demoHref: string }) {
  const [open, setOpen] = useState(0);

  return (
    <section id="scenarios" className="bg-night pb-24 pt-16 md:pb-32 md:pt-20">
      <div className={CONTAINER}>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <h2 className="max-w-2xl text-display-md text-night-foreground md:text-display-xl">{copy.title}</h2>
          <p className="max-w-sm text-body-lg text-night-muted">{copy.lead}</p>
        </div>
        <div className="mt-16 flex flex-col gap-3 md:h-[520px] md:flex-row">
          {copy.items.map((item, i) => {
            const meta = SCENARIO_META[i];
            const isOpen = i === open;
            return (
              <div
                key={item.title}
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                onMouseEnter={() => setOpen(i)}
                onFocus={() => setOpen(i)}
                onClick={() => setOpen(i)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen(i)}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-night-line text-left transition-[flex-grow,min-height] duration-700 ease-[cubic-bezier(.2,.8,.2,1)] md:min-h-0 md:flex-1",
                  isOpen ? "min-h-[300px] md:grow-[4.2]" : "min-h-24",
                )}
              >
                <Image src={meta.image} alt="" fill sizes="(min-width: 768px) 60vw, 100vw" className="object-cover opacity-40 mix-blend-luminosity transition-transform duration-700 ease-out group-hover:scale-105" />
                <div className="absolute inset-0 bg-linear-to-t from-night via-night/80 to-night/30" />
                <span className={cn("absolute bottom-6 left-6 hidden origin-bottom-left translate-x-6 -rotate-90 whitespace-nowrap text-title text-night-foreground transition-opacity duration-300 md:block", isOpen && "opacity-0")}>
                  {item.title}
                </span>
                <span className="absolute left-6 top-6 text-title text-night-foreground md:hidden">{item.title}</span>
                <div className={cn("absolute inset-x-0 bottom-0 p-6 transition-[opacity,transform] delay-150 duration-500 motion-reduce:transform-none md:p-8", isOpen ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0")}>
                  <div className="flex items-center gap-3">
                    <NightOutcome outcome={meta.outcome} rows={meta.rows} copy={outcomeCopy} />
                    <span className="hidden text-headline text-night-foreground md:inline">{item.title}</span>
                  </div>
                  <pre className="mt-4 hidden overflow-x-auto rounded-xl bg-night/70 p-4 font-mono text-caption text-night-foreground backdrop-blur md:block">{SCENARIO_SQL[i]}</pre>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="max-w-md text-body-sm text-night-muted">{item.body}</p>
                    <Link href={demoHref} prefetch={false} tabIndex={isOpen ? 0 : -1} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-night-foreground px-4 text-caption font-medium text-night">
                      {copy.cta}
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
