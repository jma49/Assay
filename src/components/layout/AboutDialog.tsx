"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/components/common/LanguageProvider";
import { BRAND, GITHUB_URL } from "@/lib/brand";

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION;

/** The Mac "About" window: big icon, name, version, one line on what it is. */
export function AboutDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { language } = useLanguage();
  const zh = language === "zh";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[300px] gap-0 p-6 text-center sm:max-w-[300px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG needs no optimisation */}
        <img src="/brand-mark.svg" alt="" width={96} height={96} className="mx-auto size-24" />
        <DialogTitle className="mt-3 text-[22px]">{BRAND}</DialogTitle>
        {VERSION && (
          <p className="mt-1 text-[12px] text-muted-foreground">
            {zh ? "版本" : "Version"} {VERSION}
          </p>
        )}
        <DialogDescription className="mt-3 text-[13px]">
          {zh
            ? "为 PostgreSQL 写 SQL 数据检查：定时只读执行，告诉你哪里需要关注。"
            : "SQL data checks for PostgreSQL: run them read-only on a schedule and see what needs attention."}
        </DialogDescription>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-[12px] text-primary underline underline-offset-2"
        >
          github.com/jma49/Assay
        </a>
      </DialogContent>
    </Dialog>
  );
}
