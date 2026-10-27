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

const ROLE: Record<string, Label> = {
  admin: { en: "Admin", zh: "管理员" },
  manager: { en: "Manager", zh: "经理" },
  developer: { en: "Developer", zh: "开发者" },
  viewer: { en: "Viewer", zh: "查看者" },
  guest: { en: "Guest", zh: "访客" },
};

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

/** The dark rail: the mark, the two nav groups, and the person at the foot under a lead plate. */
export function Sidebar() {
  const pathname = usePathname() ?? "";
  const { language } = useLanguage();
  const { user, isLoaded } = useCurrentUser();
  const me = useMe();

  // Items that need a permission stay hidden until it is known, so they never flash for people without it.
  const allowed = (item: NavItem) => !item.requires || (me?.permissions.includes(item.requires) ?? false);
  const allItems = SECTIONS.flatMap((section) => section.items);
  const role = me?.role ? (ROLE[me.role] ?? { en: me.role, zh: me.role }) : null;

  return (
    <aside className="flex min-h-0 flex-col border-r border-sidebar-border bg-sidebar text-room-ink max-md:flex-row max-md:items-center max-md:gap-2 max-md:overflow-x-auto max-md:border-r-0 max-md:border-b max-md:px-2 max-md:py-1.5 max-md:[scrollbar-width:none]">
      <Link
        href="/checks"
        className="flex h-[52px] shrink-0 items-center border-b border-sidebar-border px-4 max-md:h-9 max-md:border-b-0 max-md:px-1"
      >
        <BrandMark className="[&>span:last-child]:text-room-ink max-md:[&>span:last-child]:hidden" />
      </Link>

      <nav aria-label={language === "zh" ? "主导航" : "Main"} className="flex flex-col max-md:flex-row max-md:gap-0.5">
        {SECTIONS.map((section) => {
          const items = section.items.filter(allowed);
          if (items.length === 0) return null;
          return (
            <div key={section.title.en} className="flex flex-col gap-px border-b border-sidebar-border px-2 pt-4 pb-3 max-md:flex-row max-md:border-b-0 max-md:p-0">
              <p className="lead px-2 pb-2 text-room-ink-3 max-md:hidden">{section.title[language]}</p>
              {items.map((item) => {
                const active = isActive(pathname, item, allItems);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-[34px] items-center gap-2.5 rounded-sm px-2.5 text-body-sm whitespace-nowrap transition-colors",
                      active
                        ? "bg-room-800 font-medium text-room-ink"
                        : "text-room-ink-2 hover:bg-room-800/60 hover:text-room-ink max-md:text-room-ink-2",
                    )}
                  >
                    {/* An ink rule on the current page's edge, so it reads at a glance. */}
                    {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-room-ink max-md:hidden" aria-hidden />}
                    <Icon className={cn("size-4 shrink-0", active ? "text-room-ink" : "text-room-ink-3")} />
                    {item.label[language]}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-2 border-t border-sidebar-border px-2 py-3 max-md:mt-0 max-md:ml-auto max-md:border-t-0 max-md:p-0">
        {isLoaded && user && (
          <div className="mr-auto flex min-w-0 items-center gap-2 max-md:mr-0">
            <UserMenu user={user} tone="room" />
          </div>
        )}
        {role && (
          <span className="lead shrink-0 rounded-sm border border-room-line-2 px-1.5 py-1 text-room-ink-2 max-lg:hidden" aria-label={role[language]}>
            {role[language]}
          </span>
        )}
      </div>
    </aside>
  );
}
