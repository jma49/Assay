"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { BrandMark } from "@/components/common/BrandMark";

/** A centred card under a slim header; used by sign-in, sign-up and the error pages. */
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
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/">
            <BrandMark />
          </Link>
          <button
            type="button"
            onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
            className="h-8 rounded-md px-2 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {language === "zh" ? "EN" : "中文"}
          </button>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pt-12 pb-16 sm:pt-20">
        <div className="flex w-full max-w-[420px] flex-col items-center gap-6 rounded-xl bg-card px-6 pt-8 pb-6 shadow-border">
          <div className="space-y-2 text-center">
            <h1 className="text-[28px] leading-tight font-semibold">{title}</h1>
            {description && <p className="text-[13.5px] text-muted-foreground">{description}</p>}
          </div>
          {children}
          {footer && <div className="text-center text-[13px] text-muted-foreground">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

export const clerkAppearance = {
  elements: {
    rootBox: "w-full",
    cardBox: "w-full !shadow-none !border-0 !rounded-none",
    card: "!shadow-none !border-0 !p-0",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    formButtonPrimary: "!bg-primary !text-primary-foreground !rounded-md !shadow-xs hover:!brightness-110",
    socialButtonsBlockButton: "!rounded-md !border-border-strong",
    formFieldInput: "!rounded-md !border-input",
  },
};
