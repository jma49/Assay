"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  Activity,
  BarChart3,
  BellRing,
  BookOpen,
  CheckCircle2,
  Database,
  History,
  KeyRound,
  ListChecks,
  Table2,
  Users,
} from "lucide-react";
import { UserMenu } from "@/components/auth/UserMenu";
import { BrandMark } from "@/components/common/BrandMark";
import { useLanguage } from "@/components/common/LanguageProvider";
import { useCurrentUser } from "@/lib/auth/client";
import { useMe } from "@/lib/auth/use-me";
import { cn } from "@/lib/utils/utils";

type Label = { en: string; zh: string };

interface NavItem {
  href: string;
  label: Label;
  icon: ComponentType<{ className?: string }>;
  /** Shown only with this permission; the page enforces it anyway. */
  requires?: string;
}

const SECTIONS: { title: Label; items: NavItem[] }[] = [
  {
    title: { en: "Monitor", zh: "监控" },
    items: [
      { href: "/checks", label: { en: "Checks", zh: "检查" }, icon: ListChecks },
      { href: "/activity", label: { en: "Activity", zh: "动态" }, icon: Activity },
      { href: "/runs", label: { en: "Runs", zh: "执行记录" }, icon: History },
      { href: "/coverage", label: { en: "Coverage", zh: "覆盖情况" }, icon: Table2 },
      { href: "/data-analysis", label: { en: "Analysis", zh: "分析" }, icon: BarChart3 },
    ],
  },
  {
    title: { en: "Workspace", zh: "工作区" },
    items: [
      {
        href: "/approvals",
        label: { en: "Approvals", zh: "审批" },
        icon: CheckCircle2,
        requires: "check:approve",
      },
      { href: "/settings/notifications", label: { en: "Notifications", zh: "通知" }, icon: BellRing },
      { href: "/settings/data-sources", label: { en: "Data sources", zh: "数据源" }, icon: Database },
      { href: "/settings/api-keys", label: { en: "API keys", zh: "API 密钥" }, icon: KeyRound },
      { href: "/admin/users", label: { en: "Members", zh: "成员" }, icon: Users, requires: "user:manage" },
      { href: "/docs", label: { en: "Docs", zh: "文档" }, icon: BookOpen },
    ],
  },
];

/** How specifically an item matches the path: the length of its href when it owns the path, or 0. */
function matchLength(pathname: string, item: NavItem): number {
  const owns = pathname === item.href || pathname.startsWith(`${item.href}/`);
  return owns ? item.href.length : 0;
}

/** Only the most specific match is active, so /checks/manage lights Checks and /runs/abc lights Runs. */
function isActive(pathname: string, item: NavItem, all: NavItem[]): boolean {
  const length = matchLength(pathname, item);
  return length > 0 && all.every((other) => other === item || matchLength(pathname, other) < length);
}

export function Sidebar() {
  const pathname = usePathname() ?? "";
  const { language, setLanguage } = useLanguage();
  const { user, isLoaded } = useCurrentUser();
  const me = useMe();

  // Items that need a permission stay hidden until it is known, so they never flash for people without it.
  const allowed = (item: NavItem) => !item.requires || (me?.permissions.includes(item.requires) ?? false);
  const allItems = SECTIONS.flatMap((section) => section.items);

  // A ruled column on the paper: the mark, then each section under a hairline, the account at the foot.
  return (
    <aside className="flex min-h-0 flex-col border-r border-sidebar-border bg-sidebar max-md:flex-row max-md:items-center max-md:gap-3 max-md:overflow-x-auto max-md:border-r-0 max-md:border-b max-md:px-4 max-md:py-2">
      <Link href="/checks" className="flex h-12 shrink-0 items-center border-b border-sidebar-border px-5 max-md:h-auto max-md:border-b-0 max-md:px-0">
        <BrandMark className="max-md:[&>span:last-child]:hidden" />
      </Link>

      <nav aria-label={language === "zh" ? "主导航" : "Main"} className="flex flex-col max-md:flex-row max-md:gap-1">
        {SECTIONS.map((section) => {
          const items = section.items.filter(allowed);
          if (items.length === 0) return null;
          return (
            <div key={section.title.en} className="flex flex-col gap-px border-b border-sidebar-border px-3 pt-4 pb-3 max-md:flex-row max-md:border-b-0 max-md:p-0">
              <p className="px-2 pb-2 font-mono text-label-caps uppercase text-muted-foreground max-md:hidden">
                {section.title[language]}
              </p>
              {items.map((item) => {
                const active = isActive(pathname, item, allItems);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-9 items-center gap-3 px-2 text-body-md whitespace-nowrap transition-colors",
                      active
                        ? "bg-card font-medium text-foreground shadow-border"
                        : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {/* An indigo rule on the current page's edge, so it reads at a glance. */}
                    {active && <span className="absolute inset-y-0 left-0 w-0.5 bg-primary max-md:hidden" aria-hidden />}
                    <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                    {item.label[language]}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-1 border-t border-sidebar-border px-3 py-3 max-md:mt-0 max-md:ml-auto max-md:border-t-0 max-md:p-0">
        {isLoaded && user && (
          <div className="mr-auto flex min-w-0 items-center gap-2 max-md:mr-0">
            <UserMenu user={user} />
          </div>
        )}
        <button
          type="button"
          className="h-8 border border-transparent px-2.5 font-mono text-caption text-muted-foreground hover:border-rule-strong hover:bg-card hover:text-foreground"
          onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
        >
          {language === "zh" ? "EN" : "中文"}
        </button>
      </div>
    </aside>
  );
}
