"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import { Sidebar } from "@/components/layout/Sidebar";
import { AppShellStateProvider, useAppShellState } from "@/components/layout/app-shell-state";
import { useMe } from "@/lib/auth/use-me";

type Label = { en: string; zh: string };

// Longest prefix first, so nested pages resolve to their own title.
const TITLES: [string, Label][] = [
  ["/manage-scripts/approvals", { en: "Approvals", zh: "审批" }],
  ["/manage-scripts/edit-history", { en: "Edit history", zh: "编辑历史" }],
  ["/manage-scripts", { en: "Checks", zh: "检查" }],
  ["/scripts/new", { en: "New check", zh: "新建检查" }],
  ["/dashboard", { en: "Runs", zh: "执行记录" }],
  ["/view-execution-result", { en: "Run", zh: "执行结果" }],
  ["/coverage", { en: "Coverage", zh: "覆盖情况" }],
  ["/data-analysis", { en: "Analysis", zh: "分析" }],
  ["/admin/users", { en: "Members", zh: "成员" }],
];

function TopBar() {
  const pathname = usePathname() ?? "";
  const { language } = useLanguage();
  const { setToolbarSlot, setStatusSlot } = useAppShellState();
  const me = useMe();
  const title = TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1][language] ?? "";
  const canCreate = me?.permissions.includes("script:create") && !pathname.startsWith("/scripts/new");

  return (
    <header className="relative flex min-h-[52px] items-center gap-3 border-b bg-card px-7 py-2.5 max-md:flex-wrap max-md:px-4">
      <div className="flex min-w-0 shrink items-baseline gap-3">
        <span className="truncate text-[13.5px] font-medium">{title}</span>
        <span ref={setStatusSlot} className="truncate text-[12.5px] text-subtle-foreground empty:hidden max-xl:hidden" />
      </div>
      {/* Filled by WindowToolbar: the page's own filters and actions, kept on the right. */}
      <div ref={setToolbarSlot} className="ml-auto flex min-w-0 items-center justify-end gap-2 empty:hidden max-md:flex-wrap" />
      {canCreate && (
        <Link
          href="/scripts/new"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground shadow-xs hover:brightness-110 transition-[filter,box-shadow,background-color,scale] duration-150 ease-out active:scale-[0.96] [:empty+&]:ml-auto"
        >
          <Plus className="size-4" />
          {language === "zh" ? "新建检查" : "New check"}
        </Link>
      )}
      <NavigationProgress />
    </header>
  );
}

function GuestBanner() {
  const me = useMe();
  const { language } = useLanguage();
  if (!me?.guest) return null;
  return (
    <div role="note" className="flex flex-wrap items-center gap-2.5 border-b bg-primary-soft px-7 py-2 text-[13px] max-md:px-4">
      <span className="rounded-full bg-card px-2 py-0.5 text-[12px] font-medium text-primary">Demo</span>
      {language === "zh"
        ? "这个工作区监控着一个预先埋入问题的示例商店数据库。"
        : "This workspace watches a sample shop database with problems planted in it."}
    </div>
  );
}

/** Signed-in pages: a sidebar for navigation and a top bar for the page's own actions. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppShellStateProvider>
      <a
        href="#content"
        className="fixed top-2 left-2 z-50 -translate-y-16 rounded-md bg-primary px-3 py-2 text-[13px] font-medium text-primary-foreground focus-visible:translate-y-0"
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
