"use client";

import { useCallback, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import type { LandingCopy } from "../content";
import { gsap, MOTION, ScrollTrigger, useGSAP } from "../motion";
import { RUN_SCENES } from "./RunScenes";

const STEPS = RUN_SCENES.length;

/**
 * "What happens in one run": four steps on one stage.
 * Desktop with motion: the section pins and scrolling drives the steps, snapping to each.
 * Desktop with reduced motion: the stepper is a set of tabs, with previous and next.
 * Phones: the steps stack and each scene plays when it scrolls into view.
 */
export function RunAnatomy({ copy }: { copy: LandingCopy["run"] }) {
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
        Object.assign(pin.style, { height: "100vh", justifyContent: "center", paddingTop: "96px", paddingBottom: "32px" });
        const trigger = ScrollTrigger.create({
          trigger: pin,
          start: "top top",
          end: () => `+=${window.innerHeight * 2.4}`,
          pin: true,
          scrub: true,
          snap: { snapTo: 1 / (STEPS - 1), duration: { min: 0.25, max: 0.6 }, delay: 0.08, ease: "power2.inOut" },
          onUpdate: (self) => {
            const p = self.progress * (STEPS - 1);
            fills.forEach((f, i) => gsap.set(f, { scaleX: gsap.utils.clamp(0, 1, p - i + 1) }));
            activate(Math.round(p));
          },
        });
        gsap.set(fills[0], { scaleX: 1 });
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
    <section ref={scope} id="run" className="relative bg-night">
      <div ref={pinRef} className="relative mx-auto flex max-w-[1120px] flex-col px-4 py-24 sm:px-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end md:gap-12">
          <h2 className="text-display-md text-night-foreground lg:text-display-lg">{copy.title}</h2>
          <p className="max-w-sm text-body-md text-night-muted">{copy.lead}</p>
        </div>

        <div className="mt-10 hidden grid-cols-4 gap-4 md:grid">
          {copy.steps.map((s, i) => (
            <button
              key={s.title}
              type="button"
              data-step={i}
              onClick={tabs ? () => activate(i) : undefined}
              aria-current={i === step ? "step" : undefined}
              className="group flex flex-col justify-start self-start text-left"
            >
              <span className="block h-[3px] overflow-hidden rounded-full bg-night-foreground/10">
                <span data-run-fill className={cn("block h-full w-full origin-left rounded-full bg-night-accent", tabs ? (i <= step ? "scale-x-100" : "scale-x-0") : "scale-x-0")} />
              </span>
              <span className="mt-4 flex items-baseline gap-2.5">
                <span className="text-caption font-medium tabular-nums text-night-muted">0{i + 1}</span>
                <span className={cn("text-body-md font-medium transition-colors duration-300 group-hover:text-night-foreground", i === step ? "text-night-foreground" : "text-night-muted")}>{s.title}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="relative mt-6 hidden md:block" style={{ height: "clamp(340px, 52vh, 440px)" }}>
          <div aria-hidden className="absolute inset-x-24 inset-y-10 rounded-full bg-primary/20 blur-[100px]" />
          <div className="lift-night relative h-full overflow-hidden rounded-3xl border border-night-foreground/10 bg-night-raised/80 backdrop-blur">
            {RUN_SCENES.map((Scene, i) => (
              <div
                key={i}
                aria-hidden={i !== step}
                className={cn(
                  "absolute inset-0 grid items-center gap-8 p-9 transition-[opacity,transform] duration-500 ease-out motion-reduce:transform-none md:grid-cols-[minmax(0,.8fr)_minmax(0,1.6fr)]",
                  i === step ? "opacity-100" : "pointer-events-none invisible translate-y-3 opacity-0",
                )}
              >
                <div>
                  <span className="font-display block text-display-xl tabular-nums text-night-foreground/[.08]">0{i + 1}</span>
                  <p className="font-display mt-4 text-headline text-night-foreground">{copy.steps[i].title}</p>
                  <p className="mt-3 max-w-xs text-body-md text-night-muted">{copy.steps[i].body}</p>
                </div>
                <div className="min-w-0">
                  <Scene copy={copy} play={plays[i]} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {tabs && (
          <div className="mt-4 hidden justify-end gap-2 md:flex">
            <button type="button" onClick={() => go(step - 1)} aria-label={copy.previous} className="inline-flex size-9 items-center justify-center rounded-full border border-night-foreground/15 bg-night-foreground/5 text-night-foreground hover:bg-night-foreground/10">
              <ArrowLeft className="size-4" />
            </button>
            <button type="button" onClick={() => go(step + 1)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-night-foreground px-4 text-caption font-medium text-night">
              {copy.next}
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        )}

        <div className="mt-10 space-y-10 md:hidden">
          {RUN_SCENES.map((Scene, i) => (
            <div key={i} data-run-mobile>
              <div className="flex items-baseline gap-2.5">
                <span className="text-caption font-medium tabular-nums text-night-muted">0{i + 1}</span>
                <p className="text-title-sm font-medium text-night-foreground">{copy.steps[i].title}</p>
              </div>
              <p className="mt-2 text-body-md text-night-muted">{copy.steps[i].body}</p>
              <div className="mt-4">
                <Scene copy={copy} play={mobilePlays[i]} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
