"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { BrandMark } from "@/components/common/BrandMark";

/** A centred sheet on the lit face, under the room's slim top bar; used by the error pages. */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col bg-room-950 text-room-ink">
      <header className="border-b border-room-line">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/">
            <BrandMark className="[&>span:last-child]:text-room-ink" />
          </Link>
          <button
            type="button"
            onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
            className="h-8 rounded-sm px-2 font-mono text-body-sm text-room-ink-3 hover:bg-room-800 hover:text-room-ink"
          >
            {language === "zh" ? "EN" : "中文"}
          </button>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pt-12 pb-16 sm:pt-20">
        <div className="app-face flex w-full max-w-[440px] flex-col items-center gap-6 px-6 pt-8 pb-6 text-ink">
          <div className="space-y-2 text-center">
            <h1 className="font-display text-display-sm">{title}</h1>
            {description && <p className="text-body-md text-ink-2">{description}</p>}
          </div>
          {children}
          {footer && <div className="text-center text-body-sm text-ink-2">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
