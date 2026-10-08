"use client";

import { useCallback, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import type { LandingCopy } from "../content";
import { gsap, MOTION, ScrollTrigger, useGSAP } from "../motion";
import { RUN_SCENES } from "./RunScenes";
import { FRAME, SectionHead } from "../ui";

const STEPS = RUN_SCENES.length;

/**
 * "What happens in one run": four steps on one stage.
 * Desktop with motion: the section pins and scrolling drives the steps, snapping to each.
 * Desktop with reduced motion: the stepper is a set of tabs, with previous and next.
 * Phones: the steps stack and each scene plays when it scrolls into view.
 */
export function RunAnatomy({ label, copy }: { label: string; copy: LandingCopy["run"] }) {
  const scope = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const stepRef = useRef(-1);
  const [plays, setPlays] = useState<number[]>(() => Array(STEPS).fill(0));
  const [mobilePlays, setMobilePlays] = useState<number[]>(() => Array(STEPS).fill(0));
  const [tabs, setTabs] = useState(false);

  const activate = useCallback((n: number) => {
    if (n === stepRef.current) return;
    stepRef.current = n;
    setStep(n);
    setPlays((p) => p.map((v, i) => (i === n ? v + 1 : v)));
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      const fills = gsap.utils.toArray<HTMLElement>("[data-run-fill]");

      mm.add(`(min-width: 768px) and ${MOTION.full}`, () => {
        const pin = pinRef.current;
        if (!pin) return;
        // The sticky nav is 64px tall; the pinned stage fills the rest of the screen below it.
        Object.assign(pin.style, { height: "100vh", justifyContent: "center", paddingTop: "64px" });
        const trigger = ScrollTrigger.create({
          trigger: pin,
          start: "top top",
          end: () => `+=${window.innerHeight * 2.4}`,
          pin: true,
          scrub: true,
          snap: { snapTo: 1 / (STEPS - 1), duration: { min: 0.25, max: 0.6 }, delay: 0.08, ease: "power2.inOut" },
          onUpdate: (self) => {
            const p = self.progress * (STEPS - 1);
            fills.forEach((f, i) => {
              gsap.set(f, { scaleX: gsap.utils.clamp(0, 1, p - i + 1) });
            });
            activate(Math.round(p));
          },
        });
        const [firstFill] = fills;
        if (firstFill) gsap.set(firstFill, { scaleX: 1 });
        activate(0);
        const jump = (e: Event) => {
          const i = Number((e.currentTarget as HTMLElement).dataset.step);
          window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * (i / (STEPS - 1)) + 1, behavior: "smooth" });
        };
        const buttons = pin.querySelectorAll<HTMLElement>("[data-step]");
        buttons.forEach((b) => b.addEventListener("click", jump));
        return () => {
          buttons.forEach((b) => b.removeEventListener("click", jump));
          pin.removeAttribute("style");
          stepRef.current = -1;
        };
      });

      mm.add(`(min-width: 768px) and ${MOTION.reduced}`, () => {
        // With reduced motion nothing waits for the scroll: the first step shows at once,
        // so the section has the same height however and whenever the page is read.
        setTabs(true);
        activate(0);
        return () => setTabs(false);
      });

      mm.add("(max-width: 767px)", () => {
        gsap.utils.toArray<HTMLElement>("[data-run-mobile]").forEach((el, i) => {
          ScrollTrigger.create({ trigger: el, start: "top 75%", once: true, onEnter: () => setMobilePlays((p) => p.map((v, k) => (k === i ? v + 1 : v))) });
        });
      });
    },
    { scope },
  );

  const go = (n: number) => activate((n + STEPS) % STEPS);

  return (
    <section ref={scope} id="run" className="border-t border-rule">
      <div ref={pinRef} className={cn(FRAME, "ticks flex flex-col")}>
        <SectionHead eyebrow={label} title={copy.title} lead={copy.lead} className="md:pb-10 md:pt-16" />

        <div className="hidden grid-cols-4 border-t border-rule md:grid">
          {copy.steps.map((s, i) => (
            <button
              key={s.title}
              type="button"
              data-step={i}
              onClick={tabs ? () => activate(i) : undefined}
              aria-current={i === step ? "step" : undefined}
              className={cn("group relative flex flex-col items-start px-8 pb-5 pt-6 text-left", i > 0 && "border-l border-rule")}
            >
              <span className="absolute inset-x-0 -top-px block h-px overflow-hidden">
                <span data-run-fill className={cn("block h-full w-full origin-left bg-primary", tabs ? (i <= step ? "scale-x-100" : "scale-x-0") : cn("scale-x-0", i === 0 && "motion-reduce:scale-x-100"))} />
              </span>
              <span className="font-mono text-caption tabular-nums text-ink-muted">0{i + 1}</span>
              <span className={cn("mt-2 text-body-md font-medium transition-colors duration-300 group-hover:text-ink", i === step ? "text-ink" : "text-ink-muted")}>{s.title}</span>
            </button>
          ))}
        </div>

        <div className="graph relative hidden border-t border-rule md:block" style={{ height: "clamp(360px, 54vh, 460px)" }}>
          {RUN_SCENES.map((Scene, i) => (
            <div
              key={i}
              aria-hidden={i !== step}
              className={cn(
                "absolute inset-0 grid items-center gap-10 px-12 py-10 transition-[opacity,transform] duration-500 ease-out motion-reduce:transform-none md:grid-cols-[minmax(0,.8fr)_minmax(0,1.6fr)]",
                i === step ? "opacity-100" : "pointer-events-none invisible translate-y-3 opacity-0",
              )}
            >
              <div>
                <span className="font-editorial block text-display-xl tabular-nums text-ink-muted/30">0{i + 1}</span>
                <p className="font-editorial mt-3 text-display-sm text-ink">{copy.steps[i]?.title}</p>
                <p className="mt-3 max-w-xs text-body-md text-ink-muted">{copy.steps[i]?.body}</p>
              </div>
              <div className="min-w-0">
                <Scene copy={copy} play={plays[i] ?? 0} />
              </div>
            </div>
          ))}
        </div>

        {/* Shown by CSS, not by the `tabs` state: the media query applies on first paint, so the
            section has its final height before GSAP's matchMedia callback runs. */}
        <div className="hidden justify-end gap-2 border-t border-rule px-8 py-4 motion-reduce:md:flex">
          <button type="button" onClick={() => go(step - 1)} aria-label={copy.previous} className="inline-flex size-9 items-center justify-center rounded-md border border-rule-strong bg-paper-raised text-ink hover:border-ink-muted">
            <ArrowLeft className="size-4" />
          </button>
          <button type="button" onClick={() => go(step + 1)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-ink px-4 text-caption font-medium text-paper">
            {copy.next}
            <ArrowRight className="size-3.5" />
          </button>
        </div>

        <div className="space-y-10 border-t border-rule px-5 py-10 md:hidden">
          {RUN_SCENES.map((Scene, i) => (
            <div key={i} data-run-mobile>
              <div className="flex items-baseline gap-2.5">
                <span className="font-mono text-caption tabular-nums text-ink-muted">0{i + 1}</span>
                <p className="text-title-sm font-medium text-ink">{copy.steps[i]?.title}</p>
              </div>
              <p className="mt-2 text-body-md text-ink-muted">{copy.steps[i]?.body}</p>
              <div className="mt-4">
                <Scene copy={copy} play={mobilePlays[i] ?? 0} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
