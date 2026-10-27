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
 * The panel beside the sign-in form: the dark room around the light box, the pitch in room ink,
 * and the live demo's last alert printed on film. The alert's Acknowledge press plays once.
 */
export function SignInBrand({ language, tagline, points, footnote }: { language: Language; tagline: string; points: Point[]; footnote: string }) {
  const alert = ALERT[language];
  const [acked, setAcked] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAcked(true), 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <aside className="hidden border-r border-room-line bg-room-950 text-room-ink lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b border-room-line px-14 xl:px-20">
        <Link href="/" className="flex w-fit items-center gap-2.5">
          <RowAMark className="size-7" />
          <span className="font-display text-title-sm">{BRAND}</span>
        </Link>
      </div>

      <div className="px-14 py-14 xl:px-20">
        <p className="lead mb-4 text-room-ink-3">{language === "zh" ? "只读检查" : "Read-only checks"}</p>
        <p className="font-display max-w-lg text-balance text-display-lg text-room-ink">{tagline}</p>
      </div>

      <ul className="border-t border-room-line">
        {points.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-4 border-b border-room-line px-14 py-5 xl:px-20">
            <Icon className="mt-0.5 size-[18px] shrink-0 text-room-ink-3" />
            <span className="grid gap-0.5">
              <span className="text-body-md font-medium text-room-ink">{title}</span>
              <span className="text-body-sm text-room-ink-2">{body}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-1 flex-col justify-end px-14 py-12 xl:px-20">
        <div className="slip max-w-lg">
          <div className="slip-head">
            <span className="lead">{alert.channel}</span>
            <span className="text-caption text-film-print">{language === "zh" ? "9月29日" : "Sep 29"}</span>
          </div>
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 text-caption text-film-print">
              <span className="grid size-6 place-items-center rounded-sm bg-room-ink text-room-950">
                <RowAMark className="size-4" />
              </span>
              {BRAND}
            </div>
            <p className="mt-2 text-body-sm font-medium">{alert.title}</p>
            <p className="text-caption text-film-print">{alert.lines}</p>
          </div>
          <div className="slip-foot">
            {acked ? (
              <span className="inline-flex items-center gap-1.5 text-film-print">
                <CircleCheck className="size-4" />
                {alert.acknowledged}
              </span>
            ) : (
              <span className="flex flex-wrap gap-2">
                <span className="border border-room-line-2 px-2 py-1">{alert.open}</span>
                <span className="bg-room-ink px-2 py-1 text-room-950">{alert.acknowledge}</span>
                <span className="border border-room-line-2 px-2 py-1">{alert.mute}</span>
              </span>
            )}
          </div>
        </div>
        <p className="mt-8 font-mono text-caption text-room-ink-3">{footnote}</p>
      </div>
    </aside>
  );
}
