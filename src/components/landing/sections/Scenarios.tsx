"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import type { LandingCopy } from "../content";
import { SCENARIO_META, SCENARIO_SQL } from "../data";
import { OutcomePill, Section, SectionHead } from "../ui";

/** The four problems planted in the demo, as a ruled table; a row opens to show the check's SQL. */
export function Scenarios({ label, copy, outcomeCopy, demoHref }: { label: string; copy: LandingCopy["scenarios"]; outcomeCopy: LandingCopy["outcome"]; demoHref: string }) {
  const [open, setOpen] = useState(0);

  return (
    <Section id="scenarios">
      <SectionHead eyebrow={label} title={copy.title} lead={copy.lead} />
      <ol className="border-t border-rule">
        {copy.items.map((item, i) => {
          const meta = SCENARIO_META[i];
          if (!meta) return null;
          const isOpen = i === open;
          return (
            <li key={item.title} className="border-b border-rule">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? -1 : i)}
                className="grid w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-6 text-left transition-colors hover:bg-paper-raised md:grid-cols-[4rem_minmax(0,5fr)_minmax(0,5fr)_auto] md:px-12"
              >
                <span className="font-editorial text-headline tabular-nums text-ink-muted">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-title text-ink">{item.title}</span>
                <span className="col-start-2 row-start-2 text-body-sm text-ink-muted md:col-start-3 md:row-start-1">{item.body}</span>
                <span className="col-start-3 row-start-1 flex items-center gap-3 md:col-start-4">
                  <OutcomePill outcome={meta.outcome} rows={meta.rows} copy={outcomeCopy} className="max-sm:hidden" />
                  <Plus className={cn("size-4 text-ink-muted transition-transform", isOpen && "rotate-45")} />
                </span>
              </button>
              {isOpen && (
                <div className="graph border-t border-rule px-5 py-6 md:px-12 md:py-8">
                  <pre className="overflow-x-auto rounded-md border border-rule bg-paper-raised p-4 font-mono text-caption text-ink md:ml-16">{SCENARIO_SQL[i]}</pre>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <div className="flex justify-end px-5 py-6 md:px-12">
        <Link href={demoHref} prefetch={false} className="inline-flex h-10 items-center gap-1.5 rounded-md bg-ink px-4 text-body-sm font-medium text-paper transition-opacity hover:opacity-85">
          {copy.cta}
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </Section>
  );
}
