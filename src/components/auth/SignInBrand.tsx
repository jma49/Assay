"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CircleCheck, type LucideIcon } from "lucide-react";
import { RowAMark } from "@/components/brand/RowAMark";
import { landingCopy, type Language } from "@/components/landing/content";
import { BRAND } from "@/lib/brand";

interface Point {
  icon: LucideIcon;
  title: string;
  body: string;
}

/**
 * The night panel beside the sign-in form, in the landing hero's language: a spotlight,
 * a dot field and a horizon rim, with the live demo's last alert sitting on it. The alert's
 * Acknowledge press plays once; it is a small change of state, so it stays under reduced motion.
 */
export function SignInBrand({ language, tagline, points, footnote }: { language: Language; tagline: string; points: Point[]; footnote: string }) {
  const alert = landingCopy[language].run.alert;
  const [acked, setAcked] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAcked(true), 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <aside className="grain relative isolate hidden overflow-hidden bg-night text-night-foreground lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-12 xl:px-20">
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="spotlight absolute inset-x-0 top-0 h-[700px]" />
        <div className="dot-field absolute inset-0" />
      </div>

      <Link href="/" className="flex w-fit items-center gap-2.5">
        <RowAMark className="size-8" />
        <span className="font-display text-title-sm">{BRAND}</span>
      </Link>

      <div className="max-w-lg">
        <p className="font-display text-display-md text-balance lg:text-display-lg">{tagline}</p>
        <ul className="mt-9 space-y-5">
          {points.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-night-foreground/10 bg-night-foreground/5 text-night-accent">
                <Icon className="size-4" />
              </span>
              <span className="grid gap-0.5">
                <span className="text-body-md font-medium">{title}</span>
                <span className="text-body-sm text-night-muted">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mt-12">
        <div aria-hidden className="horizon pointer-events-none absolute left-1/2 top-[-44px] z-0 aspect-[2.4/1] w-[190%] -translate-x-1/2">
          <div className="horizon-glint" />
        </div>
        <div className="lift-night relative z-10 rounded-2xl border border-night-foreground/10 bg-night-raised/90 p-5 text-body-sm backdrop-blur">
          <div className="flex items-center justify-between text-caption text-night-muted">
            <span>{alert.channel}</span>
            <span>Sep 29</span>
          </div>
          <div className="mt-4 flex gap-3">
            <RowAMark className="size-9 shrink-0" />
            <div className="min-w-0">
              <div className="font-medium">{BRAND}</div>
              <div className="mt-1 font-medium">{alert.title}</div>
              <div className="text-night-muted">{alert.lines}</div>
              {acked ? (
                <div className="mt-4 flex items-center gap-2 text-night-success"><CircleCheck className="size-4" />{alert.acknowledged}</div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2 text-caption">
                  <span className="rounded-md border border-night-line px-3 py-1">{alert.open}</span>
                  <span className="rounded-md bg-night-accent px-3 py-1 text-night">{alert.acknowledge}</span>
                  <span className="rounded-md border border-night-line px-3 py-1">{alert.mute}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <p className="relative z-10 mt-8 text-caption text-night-muted">{footnote}</p>
      </div>
    </aside>
  );
}
