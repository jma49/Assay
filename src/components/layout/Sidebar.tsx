"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { useTheme } from "next-themes";
import {
  Activity,
  BarChart3,
  BellRing,
  BookOpen,
  CheckCircle2,
  History,
  KeyRound,
  ListChecks,
  Moon,
  Sun,
  Table2,
  Users,
} from "lucide-react";
import { UserMenu } from "@/components/auth/UserMenu";
import { BrandMark } from "@/components/common/BrandMark";
import { useLanguage } from "@/components/common/LanguageProvider";
import { useCurrentUser } from "@/lib/auth/client";
import { useMe } from "@/lib/auth/use-me";
import { cn } from "@/lib/utils/utils";
import { useHydrated } from "@/components/common/use-hydrated";

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
        requires: "script:approve",
      },
      { href: "/settings/notifications", label: { en: "Notifications", zh: "通知" }, icon: BellRing },
      { href: "/settings/api-keys", label: { en: "API keys", zh: "API 密钥" }, icon: KeyRound },
      { href: "/admin/users", label: { en: "Members", zh: "成员" }, icon: Users, requires: "user:manage" },
      { href: "/docs", label: { en: "Docs", zh: "文档" }, icon: BookOpen },
    ],
  },
];

const COPY = {
  en: { workspace: "Workspace", guestTitle: "You're a guest", guestBody: "Look around and run the sample checks. Sign up to write your own.", signUp: "Sign up", leave: "Leave demo", theme: "Toggle dark mode" },
  zh: { workspace: "工作区", guestTitle: "你正在以访客身份浏览", guestBody: "可以随意查看并执行示例检查。注册后可以编写自己的检查。", signUp: "注册", leave: "退出演示", theme: "切换深色模式" },
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

export function Sidebar() {
  const pathname = usePathname() ?? "";
  const { language, setLanguage } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();
  const { user, isLoaded } = useCurrentUser();
  const me = useMe();
  const mounted = useHydrated();
  const t = COPY[language] ?? COPY.en;

  // Items that need a permission stay hidden until it is known, so they never flash for people without it.
  const allowed = (item: NavItem) => !item.requires || (me?.permissions.includes(item.requires) ?? false);
  const allItems = SECTIONS.flatMap((section) => section.items);
  const guest = me?.guest === true && isLoaded && !user;

  return (
    <aside className="flex min-h-0 flex-col gap-5 border-r border-sidebar-border bg-sidebar px-2.5 py-3.5 max-md:flex-row max-md:items-center max-md:gap-3 max-md:overflow-x-auto max-md:border-r-0 max-md:border-b max-md:px-4 max-md:py-2">
      <Link href="/checks" className="flex items-center px-2 py-1 max-md:px-0">
        <BrandMark className="max-md:[&>span:last-child]:hidden" />
      </Link>

      <nav aria-label={language === "zh" ? "主导航" : "Main"} className="flex flex-col gap-4 max-md:flex-row max-md:gap-1">
        {SECTIONS.map((section) => {
          const items = section.items.filter(allowed);
          if (items.length === 0) return null;
          return (
            <div key={section.title.en} className="flex flex-col gap-0.5 max-md:flex-row">
              <p className="px-2 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase max-md:hidden">
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
                      "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13.5px] whitespace-nowrap transition-colors",
                      active
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {item.label[language]}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3 max-md:mt-0 max-md:ml-auto max-md:flex-row max-md:items-center">
        {guest && (
          <div className="rounded-lg border bg-card p-2.5 text-[12.5px] text-muted-foreground max-md:hidden">
            <p className="font-medium text-foreground">{t.guestTitle}</p>
            <p className="mt-0.5">{t.guestBody}</p>
            <Link
              href="/sign-up?redirect_url=/checks"
              className="mt-2 flex h-7 items-center justify-center rounded-md bg-primary text-[12.5px] font-medium text-primary-foreground transition-[filter,scale] duration-150 ease-out hover:brightness-110 active:scale-[0.96]"
            >
              {t.signUp}
            </Link>
            <a href="/demo/exit" className="mt-1.5 block text-center text-[12px] hover:text-foreground">
              {t.leave}
            </a>
          </div>
        )}
        <div className="flex items-center gap-1 px-1">
          {isLoaded && user && (
            <div className="mr-auto flex min-w-0 items-center gap-2 max-md:mr-0">
              <UserMenu user={user} />
            </div>
          )}
          <button
            type="button"
            className="h-7 rounded-md px-1.5 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
          >
            {language === "zh" ? "EN" : "中文"}
          </button>
          <button
            type="button"
            aria-label={t.theme}
            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {mounted && resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
