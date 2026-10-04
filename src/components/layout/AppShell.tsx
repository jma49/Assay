"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/common/LanguageProvider";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import { Sidebar } from "@/components/layout/Sidebar";
import { AppShellStateProvider, useAppShellState } from "@/components/layout/app-shell-state";
import { useMe } from "@/lib/auth/use-me";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { namesItsOwnTab, offersNewCheck, pageIntro, pageTitle, parentPage } from "@/components/layout/app-shell-routes";

function PageHeading() {
  const pathname = usePathname() ?? "";
  const { language } = useLanguage();
  const { setToolbarSlot, setStatusSlot } = useAppShellState();
  const me = useMe();
  const title = pageTitle(pathname)?.[language] ?? "";
  const intro = pageIntro(pathname)?.[language];
  const parent = parentPage(pathname);
  const canCreate = me?.permissions.includes("check:create") && offersNewCheck(pathname);
  const newCheck = language === "zh" ? "新建检查" : "New check";

  // The tab reads the page in the reader's language; a check's page names it after the check.
  useEffect(() => {
    if (title && !namesItsOwnTab(pathname)) document.title = `${title} · Assay`;
  }, [title, pathname]);

  return (
    <div className={`${APP_CONTAINER} flex flex-wrap items-end gap-x-6 gap-y-4 pt-10 max-md:pt-6`}>
      {/* The page's own <h1> is read by screen readers (PageHeader); this is the visible title. */}
      <div className="min-w-0 flex-1" aria-hidden={parent ? undefined : true}>
        {parent ? (
          <Link
            href={parent.href}
            className="inline-flex h-8 items-center gap-1 rounded-full pr-2 text-body-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            {parent.label[language]}
          </Link>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-display-md text-foreground">{title}</p>
              <span ref={setStatusSlot} className="text-body-sm text-muted-foreground empty:hidden" />
            </div>
            {intro && <p className="mt-2 max-w-[68ch] text-pretty text-body-md text-muted-foreground">{intro}</p>}
          </>
        )}
      </div>
      {/* Filled by WindowToolbar with the page's own filters and actions; on phones they take a row below the title. */}
      <div
        ref={setToolbarSlot}
        className="flex min-w-0 flex-wrap items-center justify-end gap-2 empty:hidden max-md:order-last max-md:basis-full max-md:justify-start max-md:[&>*:only-child]:flex-1"
      />
      {canCreate && (
        <Button asChild>
          <Link href="/checks/new" aria-label={newCheck}>
            <Plus />
            <span className="max-sm:sr-only">{newCheck}</span>
          </Link>
        </Button>
      )}
    </div>
  );
}

function GuestBanner() {
  const me = useMe();
  const { language } = useLanguage();
  if (!me?.guest) return null;
  const zh = language === "zh";
  return (
    <div role="note" className="bg-night px-7 py-2.5 text-body-sm text-night-muted max-md:px-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="size-1.5 shrink-0 rounded-full bg-success shadow-[0_0_0_3px_color-mix(in_srgb,var(--success)_30%,transparent)]" aria-hidden />
        <span className="min-w-0 flex-1">
          <b className="font-medium text-night-foreground">{zh ? "演示工作区" : "Demo workspace"}</b>
          <span className="max-sm:hidden">
            {" · "}
            {zh ? "监控着一个预先埋入问题的示例商店数据库。" : "It watches a sample shop database with problems planted in it."}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <a href="/demo/exit" className="px-2 text-night-muted transition-colors hover:text-night-foreground">
            {zh ? "退出演示" : "Leave demo"}
          </a>
          <Link
            href="/sign-up?redirect_url=/checks"
            className="inline-flex h-7 items-center rounded-full px-3 font-medium text-night-foreground shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--night-foreground)_28%,transparent)] transition-colors hover:bg-night-foreground/10"
          >
            {zh ? "注册" : "Sign up"}
          </Link>
        </span>
      </div>
    </div>
  );
}

/** Signed-in pages: a sidebar for navigation, then each page under its own heading and actions. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppShellStateProvider>
      <a
        href="#content"
        className="fixed top-2 left-2 z-50 -translate-y-16 rounded-md bg-primary px-3 py-2 text-body-sm font-medium text-primary-foreground focus-visible:translate-y-0"
      >
        Skip to content
      </a>
      <div className="flex h-dvh flex-col">
        <GuestBanner />
        <div className="grid min-h-0 flex-1 grid-cols-[248px_minmax(0,1fr)] max-md:grid-cols-1 max-md:grid-rows-[auto_minmax(0,1fr)]">
          <Sidebar />
          <main id="content" tabIndex={-1} className="min-h-0 min-w-0 overflow-y-auto px-8 pb-16 outline-none max-md:px-4">
            <div className="sticky top-0 z-20 h-0">
              <NavigationProgress />
            </div>
            <PageHeading />
            {children}
          </main>
        </div>
      </div>
    </AppShellStateProvider>
  );
}
