"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { ArrowRight, LoaderCircle, Play, Sparkles } from "lucide-react";
import { GithubMark } from "@/components/common/GithubMark";
import { cn } from "@/lib/utils/utils";
import { GITHUB_URL, type Language, type LandingCopy } from "../content";
import { HERO_CHECKS, runStrip } from "../data";
import { gsap, MOTION, useGSAP } from "../motion";
import { CONTAINER, NIGHT_CELL, NightOutcome } from "../ui";
import { Magnetic } from "./Magnetic";

/** The product table in the hero. A run sweeps a scan line down the rows and each status lands as the line passes it. */
function HeroWindow({ copy, outcomeCopy, language }: { copy: LandingCopy["hero"]["window"]; outcomeCopy: LandingCopy["outcome"]; language: Language }) {
  const scope = useRef<HTMLDivElement>(null);
  const [queued, setQueued] = useState<boolean[]>(() => HERO_CHECKS.map(() => false));
  const running = useRef(false);
  const { contextSafe } = useGSAP({ scope });

  const runAll = useCallback(() => {
    contextSafe(() => {
      if (running.current || !scope.current) return;
      running.current = true;
      const body = scope.current.querySelector<HTMLElement>("[data-scan-area]");
      const beam = scope.current.querySelector<HTMLElement>("[data-scan-beam]");
      const rows = [...scope.current.querySelectorAll<HTMLElement>("[data-hero-row]")];
      if (!body || !beam) return;
      setQueued(HERO_CHECKS.map(() => true));
      const height = body.offsetHeight;
      const tl = gsap.timeline({ onComplete: () => void (running.current = false) });
      tl.set(beam, { opacity: 1, y: -64 }).to(beam, { y: height, duration: 2.2, ease: "power1.inOut" });
      rows.forEach((row, i) => {
        const at = ((row.offsetTop + row.offsetHeight / 2) / height) * 2.2;
        tl.call(() => setQueued((q) => q.map((v, k) => (k === i ? false : v))), undefined, at);
        tl.fromTo(row, { backgroundColor: "color-mix(in srgb, var(--night-accent) 10%, transparent)" }, { backgroundColor: "color-mix(in srgb, var(--night-accent) 0%, transparent)", duration: 1 }, at);
      });
      tl.to(beam, { opacity: 0, duration: 0.3 });
    })();
  }, [contextSafe]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ full: MOTION.full, reduced: MOTION.reduced }, (ctx) => {
        const full = ctx.conditions?.full;
        if (full) {
          gsap.set("[data-hero-window]", { rotateX: 24, scale: 0.92, y: 40 });
          gsap.to("[data-hero-window]", { rotateX: 0, scale: 1, y: 0, ease: "none", scrollTrigger: { trigger: "[data-hero-window]", start: "top 90%", end: "top 25%", scrub: true } });
        }
        gsap.from("[data-hero-window]", { opacity: 0, y: full ? 120 : 0, duration: 1.2, delay: 0.4, ease: "power3.out", onComplete: () => void setTimeout(runAll, 300) });
      });
    },
    { scope },
  );

  return (
    <div ref={scope} className="relative mx-auto mt-20 w-full max-w-[1120px] px-4 [perspective:1600px] sm:px-6">
      <div aria-hidden className="horizon pointer-events-none absolute left-1/2 top-[-56px] z-0 aspect-[2.6/1] w-[200%] -translate-x-1/2 md:w-[170%]">
        <div className="horizon-glint" />
      </div>
      <div data-hero-window className="lift-night relative z-10 overflow-hidden rounded-2xl border border-night-foreground/10 bg-night-surface/90 backdrop-blur [transform-origin:50%_0%]">
        <div className="flex items-center justify-between border-b border-night-line px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-night-foreground/15" />
            <span className="size-2.5 rounded-full bg-night-foreground/15" />
            <span className="size-2.5 rounded-full bg-night-foreground/15" />
            <span className="ml-3 text-caption text-night-muted">{copy.label}</span>
          </div>
          <button type="button" onClick={runAll} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-night-accent px-3 text-caption font-medium text-night transition-transform active:scale-95">
            <Play className="size-3 fill-current" />
            {copy.runAll}
          </button>
        </div>
        <div className="grid lg:grid-cols-[1fr_340px]">
          <div data-scan-area className="relative overflow-x-auto">
            <div data-scan-beam aria-hidden className="scan-beam pointer-events-none absolute inset-x-0 top-0 z-10 h-16 opacity-0" />
            <table className="w-full text-left text-body-sm sm:min-w-[560px]">
              <thead className="text-caption text-night-muted">
                <tr className="border-b border-night-line">
                  <th className="px-5 py-3 font-normal">{copy.columns.check}</th>
                  <th className="px-3 py-3 font-normal">{copy.columns.status}</th>
                  <th className="hidden px-3 py-3 font-normal sm:table-cell">{copy.columns.runs}</th>
                  <th className="hidden px-5 py-3 text-right font-normal sm:table-cell">{copy.columns.schedule}</th>
                </tr>
              </thead>
              <tbody>
                {HERO_CHECKS.map((check, i) => (
                  <tr key={check.id} data-hero-row className="border-b border-night-line/60 last:border-0">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-night-foreground">{check.name[language]}</div>
                      <div className="max-w-44 truncate font-mono text-caption text-night-muted sm:max-w-none sm:overflow-visible sm:whitespace-nowrap">{check.id}</div>
                    </td>
                    <td className="px-3 py-3.5">
                      {queued[i] ? (
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-night-foreground/5 px-2.5 py-0.5 text-caption text-night-muted">
                          <LoaderCircle className="size-3 animate-spin" />
                          {copy.queued}
                        </span>
                      ) : (
                        <NightOutcome outcome={check.outcome} rows={check.rows} copy={outcomeCopy} />
                      )}
                    </td>
                    <td className="hidden px-3 py-3.5 sm:table-cell">
                      <div className="flex gap-[3px]">
                        {runStrip(check.outcome, i).map((o, k) => (
                          <span key={k} className={cn("h-4 w-1.5 rounded-sm", NIGHT_CELL[o])} />
                        ))}
                      </div>
                    </td>
                    <td className="hidden whitespace-nowrap px-5 py-3.5 text-right text-night-muted sm:table-cell">{check.schedule[language]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <aside className="hidden border-l border-night-line p-5 lg:block">
            <div className="flex items-center gap-2 text-caption text-night-muted">
              <Sparkles className="size-3.5 text-night-accent" />
              {copy.triageLabel}
              <span className="rounded-full bg-night-failure/10 px-2 py-0.5 text-night-failure">{copy.triageKind}</span>
            </div>
            <p className="mt-3 text-body-md font-medium text-night-foreground">{HERO_CHECKS.find((check) => check.outcome === "broken")?.name[language]}</p>
            <div className="mt-3 rounded-lg bg-night/60 p-3 font-mono text-caption text-night-failure">column &quot;shipping_status&quot; does not exist</div>
            <p className="mt-4 text-body-sm text-night-muted">{copy.triageBody}</p>
            <p className="mt-4 text-caption text-night-muted/80">{copy.triagePrivacy}</p>
          </aside>
        </div>
      </div>
    </div>
  );
}

export function Hero({ copy, outcomeCopy, language, demoHref, note }: { copy: LandingCopy["hero"]; outcomeCopy: LandingCopy["outcome"]; language: Language; demoHref: string; note: string | null }) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ full: MOTION.full, reduced: MOTION.reduced }, (ctx) => {
        const full = ctx.conditions?.full;
        if (full) gsap.from("[data-hero-line]", { yPercent: 110, duration: 1.1, stagger: 0.12, ease: "power4.out" });
        else gsap.from("[data-hero-line]", { opacity: 0, duration: 0.8, stagger: 0.12 });
        gsap.from("[data-hero-in]", { y: full ? 24 : 0, opacity: 0, duration: 1, stagger: 0.09, delay: 0.35, ease: "power3.out" });
      });
    },
    { scope },
  );

  return (
    <section ref={scope} className="grain relative isolate overflow-hidden bg-night pb-16 pt-36 md:pb-24 md:pt-48">
      <div aria-hidden className="absolute inset-0 -z-10">
        <Image src="/landing/hero.jpg" alt="" fill priority sizes="100vw" className="object-cover opacity-[.12] mix-blend-luminosity" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_0%,transparent_35%,var(--night)_80%)]" />
        <div className="spotlight absolute inset-x-0 top-0 h-[900px]" />
        <div className="dot-field absolute inset-0" />
      </div>

      <div className={cn(CONTAINER, "max-w-6xl text-center")}>
        <h1 className="text-display-lg text-night-foreground sm:text-display-xl lg:text-display-2xl">
          <span className="block overflow-hidden pb-[0.06em]"><span data-hero-line className="inline-block">{copy.titleTop}</span></span>
          <span className="block overflow-hidden pb-[0.06em]"><span data-hero-line className="text-shine inline-block">{copy.titleBottom}</span></span>
        </h1>
        <p data-hero-in className="mx-auto mt-7 max-w-2xl text-title-sm font-normal text-night-muted">{copy.subtitle}</p>
        <div data-hero-in className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Magnetic>
            <Link href={demoHref} prefetch={false} className="group inline-flex h-12 items-center gap-2 rounded-full bg-night-foreground px-7 text-body-lg font-medium text-night shadow-[0_0_0_6px_color-mix(in_srgb,var(--night-accent)_12%,transparent),0_18px_50px_-12px_color-mix(in_srgb,var(--night-accent)_60%,transparent)]">
              {copy.primary}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Magnetic>
          <Magnetic>
            <a href={GITHUB_URL} className="inline-flex h-12 items-center gap-2 rounded-full border border-night-foreground/15 bg-night-foreground/[.04] px-7 text-body-lg font-medium text-night-foreground backdrop-blur transition-colors hover:bg-night-foreground/10">
              <GithubMark className="size-[18px]" />
              {copy.secondary}
            </a>
          </Magnetic>
        </div>
        {note && <p data-hero-in className="mt-5 text-caption text-night-muted/80">{note}</p>}
      </div>

      <HeroWindow copy={copy.window} outcomeCopy={outcomeCopy} language={language} />
    </section>
  );
}
