"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, Clock, LockKeyhole, UsersRound } from "lucide-react";
import { HighlightedLine } from "@/components/code/HighlightedLine";
import { QUICK_START, type LandingCopy } from "../content";
import { ScrollTrigger, useGSAP } from "../motion";
import { FRAME, SectionHead } from "../ui";
import { cn } from "@/lib/utils/utils";

const LINES = QUICK_START.split("\n");
const ICONS = [LockKeyhole, UsersRound, Clock];

/** The setup steps, typed into the terminal a line at a time once it scrolls into view. */
export function SelfHost({ label, copy }: { label: string; copy: LandingCopy["selfHost"] }) {
  const scope = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(0);

  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: "[data-terminal]",
        start: "top 80%",
        once: true,
        onEnter: () => LINES.forEach((_, i) => setTimeout(() => setShown(i + 1), i * 280)),
      });
    },
    { scope },
  );

  return (
    <section ref={scope} id="self-host" className="border-t border-rule">
      <div className={cn(FRAME, "ticks")}>
        <SectionHead eyebrow={label} title={copy.title} lead={copy.body} />
        <div className="grid border-t border-rule md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div className="flex flex-col">
            <ul>
              {copy.points.map((point, i) => {
                const Icon = ICONS[i];
                return (
                  <li key={point} className="flex gap-4 border-b border-rule px-5 py-5 text-body-md text-ink md:px-8">
                    {Icon && <Icon className="mt-0.5 size-[18px] shrink-0 text-primary" />}
                    <span>{point}</span>
                  </li>
                );
              })}
            </ul>
            <Link href="/docs/deployment" className="group mt-auto inline-flex items-center gap-1.5 px-5 py-6 text-body-md font-medium text-ink md:px-8">
              {copy.guide}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="graph min-w-0 border-t border-rule p-4 sm:p-6 md:border-l md:border-t-0 md:p-10">
            <div data-terminal className="overflow-hidden rounded-md border border-night-line bg-night-surface shadow-md">
              <div className="flex items-center gap-2 border-b border-night-line px-4 py-3">
                <span className="size-2.5 rounded-full bg-night-foreground/15" />
                <span className="size-2.5 rounded-full bg-night-foreground/15" />
                <span className="size-2.5 rounded-full bg-night-foreground/15" />
                <span className="ml-2 font-mono text-caption text-night-muted">assay — zsh</span>
              </div>
              <pre className="min-h-[248px] overflow-x-auto p-5 font-mono text-body-sm text-night-foreground">
                {LINES.slice(0, shown).map((line, i) => (
                  <div key={i} className="whitespace-pre">{line ? <HighlightedLine text={line} language="shell" /> : " "}</div>
                ))}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
