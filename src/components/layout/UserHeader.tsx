"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useLanguage } from "@/components/common/LanguageProvider";
import MainNavigation from "@/components/ui/main-navigation";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils/utils";

const controlButton =
  "inline-flex h-8 items-center justify-center rounded-md px-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground";

export default function UserHeader() {
  const { user, isLoaded } = useUser();
  const { language, setLanguage } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const displayName =
    user?.fullName || user?.emailAddresses[0]?.emailAddress?.split("@")[0];

  return (
    // z-40 keeps the header under dialogs (z-50), so it can always stay sticky.
    <header className="sticky top-0 z-40 border-b bg-background">
      <NavigationProgress />
      <div className={cn(APP_CONTAINER, "flex h-14 items-center gap-6")}>
        <Link href="/dashboard" className="font-serif text-[20px] font-semibold tracking-tight">
          {BRAND}
        </Link>

        <MainNavigation className="flex-1" />

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className={controlButton}
            onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
          >
            {language === "zh" ? "EN" : "中文"}
          </button>
          <button
            type="button"
            aria-label="Toggle color theme"
            className={cn(controlButton, "w-8 px-0")}
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {mounted && resolvedTheme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </button>

          <div className="ml-2 flex items-center gap-2.5 border-l pl-3">
            {isLoaded && user ? (
              <>
                <span className="hidden text-[13px] text-muted-foreground lg:inline">
                  {displayName}
                </span>
                <UserButton
                  appearance={{ elements: { avatarBox: "size-7" } }}
                  afterSignOutUrl="/"
                />
              </>
            ) : (
              <div className="size-7 animate-pulse rounded-full bg-muted" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
