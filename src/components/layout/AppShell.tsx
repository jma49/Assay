"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import { Sidebar } from "@/components/layout/Sidebar";
import { AppShellStateProvider, useAppShellState } from "@/components/layout/app-shell-state";
import { useMe } from "@/lib/auth/use-me";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { namesItsOwnTab, offersNewCheck, pageTitle } from "@/components/layout/app-shell-routes";

function TopBar() {
  const pathname = usePathname() ?? "";
  const { language } = useLanguage();
  const { setToolbarSlot, setStatusSlot } = useAppShellState();
  const me = useMe();
  const title = pageTitle(pathname)?.[language] ?? "";
  const canCreate = me?.permissions.includes("script:create") && offersNewCheck(pathname);
  const newCheck = language === "zh" ? "新建检查" : "New check";

  // The tab reads the page in the reader's language; a check's page names it after the check.
  useEffect(() => {
    if (title && !namesItsOwnTab(pathname)) document.title = `${title} · Assay`;
  }, [title, pathname]);

  return (
    <header className="relative border-b bg-card px-7 max-md:px-4">
      {/* The same column as the page below, so the title and the actions share its edges. */}
      <div className={`${APP_CONTAINER} flex min-h-[52px] flex-wrap items-center gap-x-3 gap-y-2 py-2.5`}>
        <div className="flex min-w-0 flex-1 items-baseline gap-3 md:flex-none">
          <span className="truncate text-body-md font-medium">{title}</span>
          <span ref={setStatusSlot} className="truncate text-caption text-muted-foreground empty:hidden max-xl:hidden" />
        </div>
        {/* Filled by WindowToolbar with the page's own filters and actions; on phones they take a row below the title. */}
        <div
          ref={setToolbarSlot}
          className="flex min-w-0 items-center justify-end gap-2 empty:hidden max-md:order-last max-md:basis-full max-md:justify-start max-md:[&>*:only-child]:flex-1 md:ml-auto"
        />
        {canCreate && (
          <Link
            href="/checks/new"
            aria-label={newCheck}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-body-sm font-medium text-primary-foreground shadow-xs transition-[filter,box-shadow,background-color,scale] duration-150 ease-out hover:brightness-110 active:scale-[0.96] max-sm:px-2 md:[:empty+&]:ml-auto"
          >
            <Plus className="size-4" />
            <span className="max-sm:sr-only">{newCheck}</span>
          </Link>
        )}
      </div>
      <NavigationProgress />
    </header>
  );
}

function GuestBanner() {
  const me = useMe();
  const { language } = useLanguage();
  if (!me?.guest) return null;
  const zh = language === "zh";
  return (
    <div role="note" className="border-b bg-primary-soft px-7 py-2 text-body-sm max-md:px-4">
      <div className={`${APP_CONTAINER} flex flex-wrap items-center gap-x-2.5 gap-y-1.5`}>
        <span className="rounded-full bg-card px-2 py-0.5 text-caption font-medium text-primary">Demo</span>
        <span className="min-w-0 flex-1">
          {zh ? "这个工作区监控着一个预先埋入问题的示例商店数据库。" : "This workspace watches a sample shop database with problems planted in it."}
        </span>
        {/* The sidebar's guest card is hidden on phones; its two actions live here there. */}
        <span className="flex items-center gap-3 md:hidden">
          <Link href="/sign-up?redirect_url=/checks" className="font-medium text-primary hover:underline">
            {zh ? "注册" : "Sign up"}
          </Link>
          <a href="/demo/exit" className="text-muted-foreground hover:text-foreground">
            {zh ? "退出演示" : "Leave demo"}
          </a>
        </span>
      </div>
    </div>
  );
}

/** Signed-in pages: a sidebar for navigation and a top bar for the page's own actions. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppShellStateProvider>
      <a
        href="#content"
        className="fixed top-2 left-2 z-50 -translate-y-16 rounded-md bg-primary px-3 py-2 text-body-sm font-medium text-primary-foreground focus-visible:translate-y-0"
      >
        Skip to content
      </a>
      <div className="grid h-dvh grid-cols-[236px_minmax(0,1fr)] max-md:grid-cols-1 max-md:grid-rows-[auto_minmax(0,1fr)]">
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-col">
          <GuestBanner />
          <TopBar />
          <main id="content" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto px-7 pb-16 outline-none max-md:px-4">
            {children}
          </main>
        </div>
      </div>
    </AppShellStateProvider>
  );
}
