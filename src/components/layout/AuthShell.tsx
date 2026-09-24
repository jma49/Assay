"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { BRAND } from "@/lib/brand";

/** Centered single column used by sign-in, sign-up and the error pages. */
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
      <header className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-serif text-[20px] font-semibold tracking-tight">
          {BRAND}
        </Link>
        <button
          type="button"
          onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
          className="h-8 rounded-md px-2 text-[13px] text-muted-foreground hover:text-foreground"
        >
          {language === "zh" ? "EN" : "中文"}
        </button>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pt-12 pb-16 sm:pt-20">
        <div className="flex w-full max-w-[400px] flex-col items-center gap-6">
          <div className="space-y-2 text-center">
            <h1 className="text-[28px] leading-tight font-semibold">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {children}
          {footer && <div className="text-center text-[13px] text-muted-foreground">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

/** Clerk component styling that matches the app tokens (the shadcn theme supplies colors). */
export const clerkAppearance = {
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none border rounded-lg",
    card: "shadow-none",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
  },
};
