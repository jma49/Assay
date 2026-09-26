"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { BRAND } from "@/lib/brand";
import { AquaWallpaper } from "@/components/common/AquaWallpaper";
import { BrandMark } from "@/components/common/BrandMark";

/** Centered window on the Aqua desktop, used by sign-in, sign-up and the error pages. */
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
    // A small desktop: the Aqua wallpaper, a menu bar, and one window.
    <div className="relative flex min-h-screen flex-col">
      <AquaWallpaper className="fixed" />
      <header className="aqua-menubar relative z-10">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/">
            <BrandMark />
          </Link>
          <button
            type="button"
            onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
            className="h-8 rounded-md px-2 text-[13px] text-foreground/75 hover:text-foreground"
          >
            {language === "zh" ? "EN" : "中文"}
          </button>
        </div>
      </header>

      <main className="relative flex flex-1 items-start justify-center px-4 pt-12 pb-16 sm:pt-20">
        <div className="aqua-window aqua-window-open w-full max-w-[440px] overflow-hidden rounded-[7px]">
          <div className="aqua-titlebar relative flex h-[26px] items-center justify-center px-16 text-[13px]">
            <span className="aqua-lights absolute left-2.5" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            <span className="truncate">{BRAND}</span>
          </div>
          <div className="flex flex-col items-center gap-6 px-5 pt-7 pb-6">
            <div className="space-y-2 text-center">
              <h1 className="text-[28px] leading-tight font-semibold">{title}</h1>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            {children}
            {footer && <div className="text-center text-[13px] text-muted-foreground">{footer}</div>}
          </div>
        </div>
      </main>
    </div>
  );
}

export const clerkAppearance = {
  elements: {
    rootBox: "w-full",
    cardBox: "w-full !shadow-none !border-0 !rounded-none",
    card: "!shadow-none !border-0",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    formButtonPrimary: "aqua-gel !rounded-full !text-[#111]",
    socialButtonsBlockButton: "aqua-pill !rounded-full",
    formFieldInput: "aqua-field",
  },
};
