"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CircleCheck, type LucideIcon } from "lucide-react";
import { RowAMark } from "@/components/brand/RowAMark";
import type { Language } from "@/components/common/language-store";
import { BRAND } from "@/lib/brand";

/** The live demo's last alert (Stale pending orders, Sep 29). */
const ALERT: Record<Language, { channel: string; title: string; lines: string; open: string; acknowledge: string; mute: string; acknowledged: string }> = {
  en: {
    channel: "# data-alerts",
    title: "Stale pending orders: 8 rows new",
    lines: "Now returns 8 rows · 8 new, 0 still open, 7 fixed",
    open: "Open check",
    acknowledge: "Acknowledge",
    mute: "Mute 24 h",
    acknowledged: "Acknowledged by Sam",
  },
  zh: {
    channel: "# data-alerts",
    title: "长时间未处理的待支付订单 新增 8 行问题数据",
    lines: "当前返回 8 行 · 新增 8 行，仍存在 0 行，已修复 7 行",
    open: "查看检查",
    acknowledge: "确认处理",
    mute: "静音 24 小时",
    acknowledged: "Sam 已确认处理",
  },
};

interface Point {
  icon: LucideIcon;
  title: string;
  body: string;
}

/**
 * The panel beside the sign-in form, in the reader's language: ruled paper with a
 * serif tagline, and the live demo's last alert sitting on graph paper. The alert's
 * Acknowledge press plays once; it is a small change of state, so it stays under reduced motion.
 */
export function SignInBrand({ language, tagline, points, footnote }: { language: Language; tagline: string; points: Point[]; footnote: string }) {
  const alert = ALERT[language];
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
        <div className="corners max-w-lg border border-rule-strong bg-paper-raised p-5 text-body-sm">
          <div className="flex items-center justify-between text-caption text-ink-muted">
            <span>{alert.channel}</span>
            <span>Sep 29</span>
          </div>
          <div className="mt-4 flex gap-3">
            <span className="grid size-9 shrink-0 place-items-center bg-primary text-primary-foreground"><RowAMark className="size-5" /></span>
            <div className="min-w-0">
              <div className="font-medium">{BRAND}</div>
              <div className="mt-1 font-medium">{alert.title}</div>
              <div className="text-ink-muted">{alert.lines}</div>
              {acked ? (
                <div className="mt-4 flex items-center gap-2 text-success"><CircleCheck className="size-4" />{alert.acknowledged}</div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2 text-caption">
                  <span className="border border-rule px-3 py-1">{alert.open}</span>
                  <span className="bg-primary px-3 py-1 text-primary-foreground">{alert.acknowledge}</span>
                  <span className="border border-rule px-3 py-1">{alert.mute}</span>
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
