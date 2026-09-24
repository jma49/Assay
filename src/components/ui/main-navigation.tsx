"use client";

import React, { useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/components/common/LanguageProvider";
import {
  dashboardTranslations,
  DashboardTranslationKeys,
} from "@/components/business/dashboard/types";
import { BRAND } from "@/lib/brand";

interface NavigationItemConfig {
  href: string;
  labelKey: DashboardTranslationKeys;
  isDialog?: boolean;
}

const navigationItems: NavigationItemConfig[] = [
  { href: "/", labelKey: "navigationDashboard" },
  { href: "/manage-scripts", labelKey: "navigationScripts" },
  { href: "/data-analysis", labelKey: "navigationAnalysis" },
  { href: "/manage-scripts/approvals", labelKey: "navigationApprovals" },
  { href: "/admin/users", labelKey: "navigationUsers" },
  { href: "results-dialog", labelKey: "navigationResults", isDialog: true },
];

export default function MainNavigation({ className }: { className?: string }) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [resultsDialogOpen, setResultsDialogOpen] = React.useState(false);

  const t = useCallback(
    (key: DashboardTranslationKeys): string => {
      const langTranslations =
        dashboardTranslations[language] || dashboardTranslations.en;
      return langTranslations[key as keyof typeof langTranslations] || key;
    },
    [language],
  );

  const isActivePath = (href: string) => {
    if (!pathname) return false;
    // Exact match for "/" and "/manage-scripts" so nested pages don't light them up.
    if (href === "/" || href === "/manage-scripts") return pathname === href;
    return pathname.startsWith(href);
  };

  const renderItem = (item: NavigationItemConfig, isMobile: boolean) => {
    const isActive = !item.isDialog && isActivePath(item.href);
    const className = isMobile
      ? cn(
          "flex w-full items-center px-6 py-3 text-left text-sm transition-colors",
          isActive ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
        )
      : cn(
          // The underline sits on the header's bottom border.
          "relative flex h-14 items-center text-sm transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-0.5",
          isActive
            ? "text-foreground after:bg-foreground"
            : "text-muted-foreground hover:text-foreground",
        );
    const label = t(item.labelKey);

    if (item.isDialog) {
      return (
        <button
          key={item.href}
          type="button"
          className={className}
          onClick={() => {
            setResultsDialogOpen(true);
            setMobileMenuOpen(false);
          }}
        >
          {label}
        </button>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className={className}
        onClick={isMobile ? () => setMobileMenuOpen(false) : undefined}
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      <nav className={cn("hidden items-center gap-6 md:flex", className)}>
        {navigationItems.map((item) => renderItem(item, false))}
      </nav>

      <div className="md:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <Menu className="size-4" />
              <span className="sr-only">{language === "zh" ? "打开导航菜单" : "Open navigation"}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="border-b px-6 py-4">
              <SheetTitle className="text-left font-serif text-xl">{BRAND}</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col py-2">
              {navigationItems.map((item) => renderItem(item, true))}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Dialog open={resultsDialogOpen} onOpenChange={setResultsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === "zh" ? "查看执行结果" : "View execution results"}
            </DialogTitle>
            <DialogDescription>
              {language === "zh"
                ? "所有执行结果都在首页的执行历史中，可以在那里筛选状态、搜索脚本并查看详情。"
                : "All run results live in the run history on the dashboard, where you can filter by status, search scripts and open details."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setResultsDialogOpen(false)}>
              {language === "zh" ? "关闭" : "Close"}
            </Button>
            <Button
              onClick={() => {
                setResultsDialogOpen(false);
                window.location.href = "/#execution-history";
              }}
            >
              {language === "zh" ? "前往执行历史" : "Go to run history"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
