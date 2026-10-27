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
    <div className={`${APP_CONTAINER} mb-2 flex flex-wrap items-end gap-x-6 gap-y-4 border-b border-line pt-7 pb-5 max-md:pt-5 max-md:pb-4`}>
      {/* The page's own <h1> is read by screen readers (PageHeader); this is the visible title. */}
      <div className="min-w-0 flex-1" aria-hidden={parent ? undefined : true}>
        {parent ? (
          <Link
            href={parent.href}
            className="inline-flex h-8 items-center gap-1 pr-2 text-body-sm text-ink-2 transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            {parent.label[language]}
          </Link>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="font-display text-display-sm text-foreground">{title}</p>
              <span ref={setStatusSlot} className="text-body-sm text-ink-2 empty:hidden" />
            </div>
            {intro && <p className="mt-1.5 max-w-[72ch] text-pretty text-body-sm text-ink-2">{intro}</p>}
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

/** The dark top bar: where you are, the demo notice, and the language switch. */
function TopBar() {
  const pathname = usePathname() ?? "";
  const { language, setLanguage } = useLanguage();
  const me = useMe();
  const zh = language === "zh";
  const section = pageTitle(pathname)?.[language];

  return (
    <header className="flex h-[52px] shrink-0 items-center gap-3 px-3 text-room-ink max-md:h-auto max-md:min-h-[52px] max-md:flex-wrap max-md:py-1.5">
      <p className="flex min-w-0 flex-1 items-center gap-2 text-caption text-room-ink-3">
        <span className="lead hidden text-room-ink-2 sm:inline">{zh ? "只读检查" : "Read-only checks"}</span>
        {section && (
          <>
            <span className="hidden h-3 w-px bg-room-line-2 sm:inline" aria-hidden />
            <span className="truncate">{section}</span>
          </>
        )}
      </p>

      {me?.guest && (
        <div role="note" className="flex min-w-0 items-center gap-2 text-caption text-room-ink-3 max-md:order-last max-md:basis-full max-md:px-1 max-md:pb-1.5">
          <span className="min-w-0 truncate">
            <b className="font-medium text-room-ink">{zh ? "演示工作区。" : "Demo workspace."}</b>{" "}
            <span className="max-lg:hidden">
              {zh ? "监控着一个预先埋入问题的示例商店数据库。" : "It watches a sample shop database with problems planted in it."}
            </span>
          </span>
          <a href="/demo/exit" className="shrink-0 px-1 transition-colors hover:text-room-ink max-sm:hidden">
            {zh ? "退出演示" : "Leave demo"}
          </a>
          <Link
            href="/sign-up?redirect_url=/checks"
            className="inline-flex h-7 shrink-0 items-center rounded-sm bg-room-ink px-3 font-medium text-room-950 transition-opacity hover:opacity-90"
          >
            {zh ? "注册" : "Sign up"}
          </Link>
        </div>
      )}

      <button
        type="button"
        className="h-8 shrink-0 rounded-sm border border-transparent px-2.5 font-mono text-caption text-room-ink-2 hover:border-room-line-2 hover:bg-room-800 hover:text-room-ink"
        onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
      >
        {language === "zh" ? "EN" : "中文"}
      </button>
    </header>
  );
}

/** Signed-in pages: a dark rail, then every page laid on the lit face. */
export function AppShell({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  return (
    <AppShellStateProvider>
      <a
        href="#content"
        className="fixed top-2 left-2 z-50 -translate-y-16 rounded-sm bg-room-ink px-3 py-2 text-body-sm font-medium text-room-950 focus-visible:translate-y-0"
      >
        {language === "zh" ? "跳到内容" : "Skip to content"}
      </a>
      <div className="grid h-dvh grid-cols-[232px_minmax(0,1fr)] bg-room-950 max-md:grid-cols-1 max-md:grid-rows-[auto_minmax(0,1fr)]">
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-col">
          <TopBar />
          <main id="content" tabIndex={-1} className="min-h-0 min-w-0 flex-1 overflow-y-auto px-2 pb-2 outline-none max-md:px-0 max-md:pb-0">
            <div className="app-face min-h-full">
              <div className="sticky top-0 z-20 h-0">
                <NavigationProgress />
              </div>
              <PageHeading />
              {children}
            </div>
          </main>
        </div>
      </div>
    </AppShellStateProvider>
  );
}
