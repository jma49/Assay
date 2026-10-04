"use client";

import { useRef } from "react";
import { Sparkles } from "lucide-react";
import type { Language, LandingCopy } from "../content";
import { SCHEDULES } from "../data";
import { gsap, MOTION, useGSAP } from "../motion";
import { CONTAINER } from "../ui";

function Visual({ index, copy, language }: { index: number; copy: LandingCopy["workflow"]; language: Language }) {
  if (index === 0) {
    return (
      <div className="text-body-sm">
        <div className="text-muted-foreground">{copy.prompt.label}</div>
        <div className="mt-1 rounded-lg bg-primary-soft px-3 py-2 text-primary-ink">{copy.prompt.text}</div>
        <div className="mt-4 text-muted-foreground">{copy.prompt.draft}</div>
        <pre className="mt-1 overflow-x-auto rounded-lg border border-border bg-code p-3 font-mono text-caption">{"SELECT o.id FROM demo.orders o\nWHERE o.status IN ('paid', 'shipped')\n  AND NOT EXISTS (...)"}</pre>
      </div>
    );
  }
  if (index === 1) {
    const [who, verb, check] = copy.approval.request;
    return (
      <div className="rounded-xl border border-border">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 text-body-sm">
          <span><b className="font-medium">{who}</b> <span className="text-muted-foreground">{verb}</span> {check}</span>
          <span className="shrink-0 rounded-full bg-attention-soft px-2.5 py-0.5 text-caption text-attention">{copy.approval.pending}</span>
        </div>
        <div className="px-4 py-3 text-caption text-muted-foreground">{copy.approval.note}</div>
        <div className="flex gap-2 border-t border-border px-4 py-3 text-caption">
          <span className="rounded-full bg-foreground px-3 py-1.5 text-background">{copy.approval.approve}</span>
          <span className="rounded-full bg-muted px-3 py-1.5">{copy.approval.reject}</span>
        </div>
      </div>
    );
  }
  if (index === 2) {
    return (
      <div className="divide-y divide-border rounded-xl border border-border text-body-sm">
        {SCHEDULES.map((s) => (
          <div key={s.cron} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="truncate">{s.name[language]}</span>
            <span className="shrink-0 font-mono text-caption text-muted-foreground">{s.cron}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border p-4 text-body-sm">
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-caption font-medium text-primary-ink"><Sparkles className="size-3.5" />{copy.triage.label}</span>
        <span className="rounded-full bg-attention-soft px-2 py-0.5 text-caption text-attention">{copy.triage.kind}</span>
      </div>
      <p className="mt-2">{copy.triage.summary}</p>
      <p className="mt-3 text-caption font-medium">{copy.triage.next}</p>
      <ul className="mt-1 list-disc pl-4 text-caption text-muted-foreground">
        {copy.triage.steps.map((s) => <li key={s}>{s}</li>)}
      </ul>
    </div>
  );
}

/** Four cards that stick and stack as you scroll; with motion, each one recedes as the next arrives. */
export function Workflow({ copy, language }: { copy: LandingCopy["workflow"]; language: Language }) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION.full, () => {
        const cards = gsap.utils.toArray<HTMLElement>("[data-stack-card]");
        // GSAP cannot tween from `filter: none`; give it an explicit start.
        gsap.set(cards, { filter: "brightness(1)" });
        cards.forEach((card, i) => {
          if (i === cards.length - 1) return;
          gsap.to(card, { scale: 0.94 + i * 0.015, filter: "brightness(.94)", ease: "none", scrollTrigger: { trigger: cards[i + 1], start: "top bottom", end: `top ${110 + (i + 1) * 22}px`, scrub: true } });
        });
      });
    },
    { scope },
  );

  return (
    <section ref={scope} id="workflow" data-landing-light className="bg-background py-24 text-foreground md:py-32">
      <div className={CONTAINER}>
        <h2 className="max-w-3xl text-display-md md:text-display-xl">{copy.title}</h2>
        <div className="mt-16 space-y-6 md:mt-20">
          {copy.steps.map((s, i) => (
            <article key={s.title} data-stack-card className="lift sticky grid origin-top gap-8 rounded-3xl bg-card p-8 md:grid-cols-2 md:p-12" style={{ top: 110 + i * 22 }}>
              <div className="flex flex-col justify-between gap-8">
                <span className="text-body-sm font-medium tabular-nums text-muted-foreground">{copy.stepLabel(i + 1, copy.steps.length)}</span>
                <div>
                  <h3 className="text-display-sm">{s.title}</h3>
                  <p className="mt-3 max-w-md text-body-lg text-muted-foreground">{s.body}</p>
                </div>
              </div>
              <Visual index={i} copy={copy} language={language} />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
