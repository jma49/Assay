"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { ArrowRight, LoaderCircle, Play, Sparkles } from "lucide-react";
import { GithubMark } from "@/components/common/GithubMark";
import { cn } from "@/lib/utils/utils";
import { GITHUB_URL, type Language, type LandingCopy } from "../content";
import { HERO_CHECKS, runStrip } from "../data";
import { gsap, MOTION, useGSAP } from "../motion";
import { FRAME, INSET, OutcomePill, RUN_CELL } from "../ui";

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
        tl.fromTo(row, { backgroundColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }, { backgroundColor: "color-mix(in srgb, var(--primary) 0%, transparent)", duration: 1 }, at);
      });
      tl.to(beam, { opacity: 0, duration: 0.3 });
    })();
  }, [contextSafe]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ full: MOTION.full, reduced: MOTION.reduced }, (ctx) => {
        const full = ctx.conditions?.full;
        gsap.from("[data-hero-window]", { opacity: 0, y: full ? 48 : 0, duration: 1.1, delay: 0.35, ease: "power3.out", onComplete: () => void setTimeout(runAll, 300) });
      });
    },
    { scope },
  );

  return (
    <div ref={scope} className="graph border-t border-rule px-3 py-8 sm:px-6 md:px-12 md:py-14">
      <div data-hero-window className="corners border border-rule-strong bg-paper-raised text-ink">
        <div className="flex items-center justify-between border-b border-rule bg-paper px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="size-2 bg-rule-strong" />
            <span className="size-2 bg-rule-strong" />
            <span className="size-2 bg-rule-strong" />
            <span className="eyebrow ml-3 text-caption text-ink-muted">{copy.label}</span>
          </div>
          <button type="button" onClick={runAll} className="inline-flex h-8 items-center gap-1.5 bg-ink px-3 text-caption font-medium text-paper transition-transform active:scale-95">
            <Play className="size-3 fill-current" />
            {copy.runAll}
          </button>
        </div>
        <div className="grid lg:grid-cols-[1fr_340px]">
          <div data-scan-area className="relative overflow-x-auto">
            <div data-scan-beam aria-hidden className="scan-beam pointer-events-none absolute inset-x-0 top-0 z-10 h-16 opacity-0" />
            <table className="w-full text-left text-body-sm sm:min-w-[560px]">
              <thead className="eyebrow text-caption text-ink-muted">
                <tr className="border-b border-rule">
                  <th className="px-5 py-3 font-normal">{copy.columns.check}</th>
                  <th className="px-3 py-3 font-normal">{copy.columns.status}</th>
                  <th className="hidden px-3 py-3 font-normal sm:table-cell">{copy.columns.runs}</th>
                  <th className="hidden px-5 py-3 text-right font-normal sm:table-cell">{copy.columns.schedule}</th>
                </tr>
              </thead>
              <tbody>
                {HERO_CHECKS.map((check, i) => (
                  <tr key={check.id} data-hero-row className="border-b border-rule last:border-0">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-ink">{check.name[language]}</div>
                      <div className="max-w-44 truncate font-mono text-caption text-ink-muted sm:max-w-none sm:overflow-visible sm:whitespace-nowrap">{check.id}</div>
                    </td>
                    <td className="px-3 py-3.5">
                      {queued[i] ? (
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap bg-paper px-2.5 py-0.5 text-caption text-ink-muted">
                          <LoaderCircle className="size-3 animate-spin" />
                          {copy.queued}
                        </span>
                      ) : (
                        <OutcomePill outcome={check.outcome} rows={check.rows} copy={outcomeCopy} />
                      )}
                    </td>
                    <td className="hidden px-3 py-3.5 sm:table-cell">
                      <div className="flex gap-[3px]">
                        {runStrip(check.outcome, i).map((o, k) => (
                          <span key={k} className={cn("h-4 w-1.5", RUN_CELL[o])} />
                        ))}
                      </div>
                    </td>
                    <td className="hidden whitespace-nowrap px-5 py-3.5 text-right text-ink-muted sm:table-cell">{check.schedule[language]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <aside className="hidden border-l border-rule bg-paper p-5 lg:block">
            <div className="flex items-center gap-2 text-caption text-ink-muted">
              <Sparkles className="size-3.5 text-primary" />
              {copy.triageLabel}
              <span className="bg-failure-soft px-2 py-0.5 text-failure">{copy.triageKind}</span>
            </div>
            <p className="mt-3 text-body-md font-medium text-ink">{HERO_CHECKS.find((check) => check.outcome === "broken")?.name[language]}</p>
            <div className="mt-3 border border-failure/20 bg-failure-soft p-3 font-mono text-caption text-failure">column &quot;shipping_status&quot; does not exist</div>
            <p className="mt-4 text-body-sm text-ink-muted">{copy.triageBody}</p>
            <p className="mt-4 text-caption text-ink-muted">{copy.triagePrivacy}</p>
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
        gsap.from("[data-hero-in]", { y: full ? 16 : 0, opacity: 0, duration: 0.9, stagger: 0.08, delay: 0.3, ease: "power3.out" });
      });
    },
    { scope },
  );

  return (
    <section ref={scope}>
      <div className={FRAME}>
        <div className={cn(INSET, "pb-14 pt-16 md:pb-20 md:pt-24")}>
          <p data-hero-in className="eyebrow text-caption text-ink-muted">{copy.eyebrow}</p>
          <div className="mt-6 grid gap-10 md:grid-cols-12 md:items-end">
            <h1 className="font-editorial text-display-xl text-ink sm:text-display-2xl md:col-span-8">
              <span className="block overflow-hidden pb-[0.08em]"><span data-hero-line className="inline-block">{copy.titleTop}</span></span>
              <span className="block overflow-hidden pb-[0.08em]"><span data-hero-line className="inline-block italic text-primary">{copy.titleBottom}</span></span>
            </h1>
            <div className="md:col-span-4">
              <p data-hero-in className="text-body-lg text-ink-muted">{copy.subtitle}</p>
              <div data-hero-in className="mt-7 flex flex-wrap items-center gap-3">
                <Link href={demoHref} prefetch={false} className="group inline-flex h-11 items-center gap-2 bg-ink px-5 text-body-md font-medium text-paper transition-opacity hover:opacity-85">
                  {copy.primary}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a href={GITHUB_URL} className="inline-flex h-11 items-center gap-2 border border-rule-strong bg-paper-raised px-5 text-body-md font-medium text-ink transition-colors hover:border-ink-muted">
                  <GithubMark className="size-4" />
                  {copy.secondary}
                </a>
              </div>
              {note && <p data-hero-in className="mt-4 text-caption text-ink-muted">{note}</p>}
            </div>
          </div>
        </div>

        <HeroWindow copy={copy.window} outcomeCopy={outcomeCopy} language={language} />

        <dl className="grid grid-cols-2 border-t border-rule md:grid-cols-4">
          {copy.stats.map((stat, i) => (
            <div key={stat.label} className={cn("px-5 py-6 md:px-8 md:py-8", i % 2 === 1 && "border-l border-rule", i >= 2 && "max-md:border-t max-md:border-rule", i === 2 && "md:border-l md:border-rule")}>
              <dt className="font-editorial text-display-md text-ink">{stat.value}</dt>
              <dd className="mt-2 text-body-sm text-ink-muted">{stat.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
