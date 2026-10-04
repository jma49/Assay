"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, Clock, LockKeyhole, UsersRound } from "lucide-react";
import { HighlightedLine } from "@/components/code/HighlightedLine";
import { QUICK_START, type LandingCopy } from "../content";
import { ScrollTrigger, useGSAP } from "../motion";
import { CONTAINER } from "../ui";

const LINES = QUICK_START.split("\n");
const ICONS = [LockKeyhole, UsersRound, Clock];

/** The setup steps, typed into the terminal a line at a time once it scrolls into view. */
export function SelfHost({ copy }: { copy: LandingCopy["selfHost"] }) {
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
    <section ref={scope} id="self-host" data-landing-light className="bg-background pb-20 text-foreground md:pb-24">
      <div className={`${CONTAINER} grid gap-12 md:grid-cols-2 md:items-center`}>
        <div>
          <h2 className="text-display-md md:text-display-lg">{copy.title}</h2>
          <p className="mt-5 max-w-md text-body-lg text-muted-foreground">{copy.body}</p>
          <ul className="mt-8 space-y-4 text-body-md">
            {copy.points.map((point, i) => {
              const Icon = ICONS[i];
              return (
                <li key={point} className="flex gap-3">
                  <Icon className="mt-0.5 size-[18px] shrink-0 text-primary" />
                  <span>{point}</span>
                </li>
              );
            })}
          </ul>
          <Link href="/docs/deployment" className="mt-9 inline-flex items-center gap-1.5 text-body-md font-medium text-primary-ink hover:underline">
            {copy.guide}
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div data-terminal className="lift overflow-hidden rounded-2xl bg-night-surface">
          <div className="flex items-center gap-2 border-b border-night-line px-4 py-3">
            <span className="size-2.5 rounded-full bg-night-foreground/15" />
            <span className="size-2.5 rounded-full bg-night-foreground/15" />
            <span className="size-2.5 rounded-full bg-night-foreground/15" />
            <span className="ml-2 text-caption text-night-muted">Terminal</span>
          </div>
          <pre className="min-h-[248px] overflow-x-auto p-5 font-mono text-body-sm text-night-foreground">
            {LINES.slice(0, shown).map((line, i) => (
              <div key={i} className="whitespace-pre">{line ? <HighlightedLine text={line} language="shell" /> : " "}</div>
            ))}
          </pre>
        </div>
      </div>
    </section>
  );
}
