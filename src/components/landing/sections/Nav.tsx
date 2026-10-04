"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/client";
import { useHydrated } from "@/components/common/use-hydrated";
import { RowAMark } from "@/components/brand/RowAMark";
import { GithubMark } from "@/components/common/GithubMark";
import { cn } from "@/lib/utils/utils";
import { BRAND, GITHUB_URL, type Language, type LandingCopy } from "../content";

/** The nav sits over night and light sections; it turns light while a light section is under it. */
function useOverLight(ref: React.RefObject<HTMLElement | null>) {
  const [overLight, setOverLight] = useState(false);
  useEffect(() => {
    const check = () => {
      const y = (ref.current?.getBoundingClientRect().bottom ?? 60) - 16;
      const light = [...document.querySelectorAll("[data-landing-light]")].some((section) => {
        const r = section.getBoundingClientRect();
        return r.top <= y && r.bottom >= y;
      });
      setOverLight(light);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [ref]);
  return overLight;
}

export function Nav({ copy, language, setLanguage, demoHref }: { copy: LandingCopy["nav"]; language: Language; setLanguage: (l: Language) => void; demoHref: string }) {
  const ref = useRef<HTMLElement>(null);
  const light = useOverLight(ref);
  const session = useCurrentUser();
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();
  const muted = light ? "text-muted-foreground hover:text-foreground" : "text-night-muted hover:text-night-foreground";

  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav
        ref={ref}
        className={cn(
          "flex w-full max-w-[1000px] items-center justify-between rounded-full border py-2 pl-3 pr-2 backdrop-blur-xl transition-colors duration-300",
          light ? "border-border bg-card/85 text-foreground lift" : "border-night-foreground/10 bg-night/70 text-night-foreground",
        )}
      >
        <Link href="/" className="flex items-center gap-2">
          <RowAMark className="size-7" />
          <span className="font-display text-title-sm tracking-tight">{BRAND}</span>
        </Link>
        <div className={cn("hidden items-center gap-6 text-body-sm lg:flex", muted)}>
          <a href="#product" className="transition-colors">{copy.product}</a>
          <a href="#run" className="transition-colors">{copy.run}</a>
          <a href="#scenarios" className="transition-colors">{copy.demo}</a>
          <a href="#self-host" className="transition-colors">{copy.selfHost}</a>
          <Link href="/docs" className="transition-colors">{copy.docs}</Link>
        </div>
        <div className="flex items-center gap-0.5">
          <a href={GITHUB_URL} aria-label="GitHub" className={cn("hidden size-9 items-center justify-center rounded-full transition-colors sm:inline-flex", muted)}>
            <GithubMark />
          </a>
          <button type="button" onClick={() => setLanguage(language === "en" ? "zh" : "en")} className={cn("h-9 rounded-full px-2.5 text-body-sm transition-colors", muted)}>
            {copy.language}
          </button>
          <button
            type="button"
            aria-label={copy.theme}
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className={cn("hidden size-9 items-center justify-center rounded-full transition-colors sm:inline-flex", muted)}
          >
            {hydrated && resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          {/* Holds its width while the session loads so the nav does not shift. */}
          {!session.isLoaded ? (
            <span className="hidden h-9 w-[84px] sm:inline-block" aria-hidden />
          ) : (
            <Link href={session.user ? "/checks" : "/sign-in?redirect_url=/checks"} className={cn("hidden h-9 items-center rounded-full px-3 text-body-sm transition-colors sm:inline-flex", muted)}>
              {session.user ? copy.openApp : copy.signIn}
            </Link>
          )}
          <Link
            href={demoHref}
            prefetch={false}
            className={cn(
              "ml-1 inline-flex h-9 items-center rounded-full px-4 text-body-sm font-medium transition-colors",
              light ? "bg-foreground text-background" : "bg-night-foreground text-night",
            )}
          >
            {copy.openDemo}
          </Link>
        </div>
      </nav>
    </header>
  );
}
