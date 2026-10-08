"use client";

import Link from "next/link";
import { useRef } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/client";
import { useHydrated } from "@/components/common/use-hydrated";
import { RowAMark } from "@/components/brand/RowAMark";
import { GithubMark } from "@/components/common/GithubMark";
import { cn } from "@/lib/utils/utils";
import { BRAND, GITHUB_URL, type Language, type LandingCopy } from "../content";
import { gsap, useGSAP } from "../motion";
import { FRAME } from "../ui";

/** A ruled bar across the top, with a hairline of the accent that fills as the page scrolls. */
export function Nav({ copy, language, setLanguage, demoHref }: { copy: LandingCopy["nav"]; language: Language; setLanguage: (l: Language) => void; demoHref: string }) {
  const scope = useRef<HTMLElement>(null);
  const session = useCurrentUser();
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();
  const quiet = "text-ink-muted transition-colors hover:text-ink";

  useGSAP(
    () => {
      gsap.fromTo("[data-progress]", { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: true } });
    },
    { scope },
  );

  return (
    <header ref={scope} className="sticky top-0 z-50 border-b border-rule bg-paper/85 backdrop-blur-md">
      <nav className={cn(FRAME, "flex h-14 items-center justify-between border-x-0 px-1 md:h-16")}>
        <Link href="/" className="flex items-center gap-2 text-ink">
          <RowAMark className="size-6" />
          <span className="font-display text-title-sm tracking-tight">{BRAND}</span>
        </Link>
        <div className="hidden items-center gap-7 text-body-sm lg:flex">
          <a href="#product" className={quiet}>{copy.product}</a>
          <a href="#run" className={quiet}>{copy.run}</a>
          <a href="#scenarios" className={quiet}>{copy.demo}</a>
          <a href="#self-host" className={quiet}>{copy.selfHost}</a>
          <Link href="/docs" className={quiet}>{copy.docs}</Link>
        </div>
        <div className="flex items-center gap-0.5">
          <a href={GITHUB_URL} aria-label="GitHub" className={cn("hidden size-9 items-center justify-center rounded-full sm:inline-flex", quiet)}>
            <GithubMark />
          </a>
          <button type="button" onClick={() => setLanguage(language === "en" ? "zh" : "en")} className={cn("h-9 rounded-full px-2.5 text-body-sm", quiet)}>
            {copy.language}
          </button>
          <button
            type="button"
            aria-label={copy.theme}
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className={cn("hidden size-9 items-center justify-center rounded-full sm:inline-flex", quiet)}
          >
            {hydrated && resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          {/* Holds its width while the session loads so the nav does not shift. */}
          {!session.isLoaded ? (
            <span className="hidden h-9 w-[84px] sm:inline-block" aria-hidden />
          ) : (
            <Link href={session.user ? "/checks" : "/sign-in?redirect_url=/checks"} className={cn("hidden h-9 items-center rounded-full px-3 text-body-sm sm:inline-flex", quiet)}>
              {session.user ? copy.openApp : copy.signIn}
            </Link>
          )}
          <Link href={demoHref} prefetch={false} className="ml-1 inline-flex h-9 items-center rounded-md bg-ink px-4 text-body-sm font-medium text-paper transition-opacity hover:opacity-85">
            {copy.openDemo}
          </Link>
        </div>
      </nav>
      <span aria-hidden data-progress className="absolute inset-x-0 -bottom-px block h-px origin-left scale-x-0 bg-primary" />
    </header>
  );
}
