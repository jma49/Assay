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
 * The panel beside the sign-in form, in the landing page's language: ruled paper with a
 * serif tagline, and the live demo's last alert sitting on graph paper. The alert's
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
    <aside className="hidden border-r border-rule bg-paper text-ink lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b border-rule px-14 xl:px-20">
        <Link href="/" className="flex w-fit items-center gap-2.5">
          <RowAMark className="size-7" />
          <span className="font-display text-title-sm">{BRAND}</span>
        </Link>
      </div>

      <div className="px-14 py-14 xl:px-20">
        <p className="font-editorial max-w-lg text-balance text-display-lg">{tagline}</p>
      </div>

      <ul className="border-t border-rule">
        {points.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-4 border-b border-rule px-14 py-5 xl:px-20">
            <Icon className="mt-0.5 size-[18px] shrink-0 text-primary" />
            <span className="grid gap-0.5">
              <span className="text-body-md font-medium">{title}</span>
              <span className="text-body-sm text-ink-muted">{body}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="graph flex flex-1 flex-col justify-end px-14 py-12 xl:px-20">
        <div className="max-w-lg rounded-md border border-rule bg-paper-raised p-5 text-body-sm shadow-md">
          <div className="flex items-center justify-between text-caption text-ink-muted">
            <span>{alert.channel}</span>
            <span>Sep 29</span>
          </div>
          <div className="mt-4 flex gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><RowAMark className="size-5" /></span>
            <div className="min-w-0">
              <div className="font-medium">{BRAND}</div>
              <div className="mt-1 font-medium">{alert.title}</div>
              <div className="text-ink-muted">{alert.lines}</div>
              {acked ? (
                <div className="mt-4 flex items-center gap-2 text-success"><CircleCheck className="size-4" />{alert.acknowledged}</div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2 text-caption">
                  <span className="rounded-md border border-rule px-3 py-1">{alert.open}</span>
                  <span className="rounded-md bg-primary px-3 py-1 text-primary-foreground">{alert.acknowledge}</span>
                  <span className="rounded-md border border-rule px-3 py-1">{alert.mute}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <p className="eyebrow mt-8 text-caption text-ink-muted">{footnote}</p>
      </div>
    </aside>
  );
}
