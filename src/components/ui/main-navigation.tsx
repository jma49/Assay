"use client";

import React, { useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  FileText,
  BarChart3,
  History,
  Menu,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLanguage } from "@/components/LanguageProvider";
import {
  dashboardTranslations,
  DashboardTranslationKeys,
} from "@/components/dashboard/types";

// 导航项配置
const navigationItems = [
  {
    href: "/",
    icon: Home,
    labelKey: "navigationDashboard" as DashboardTranslationKeys,
    description: "查看系统概览和执行历史",
  },
  {
    href: "/manage-scripts",
    icon: FileText,
    labelKey: "navigationScripts" as DashboardTranslationKeys,
    description: "管理和编辑SQL脚本",
  },
  {
    href: "/data-analysis",
    icon: BarChart3,
    labelKey: "navigationAnalysis" as DashboardTranslationKeys,
    description: "查看数据分析和趋势",
  },
  {
    href: "/view-execution-result",
    icon: History,
    labelKey: "navigationResults" as DashboardTranslationKeys,
    description: "查看详细执行结果",
  },
];

interface NavigationProps {
  className?: string;
}

interface BreadcrumbProps {
  className?: string;
}

// 面包屑导航组件
export function Breadcrumb({ className }: BreadcrumbProps) {
  const pathname = usePathname();
  const { language } = useLanguage();

  const t = useCallback(
    (key: DashboardTranslationKeys): string => {
      const langTranslations =
        dashboardTranslations[language] || dashboardTranslations.en;
      return langTranslations[key as keyof typeof langTranslations] || key;
    },
    [language],
  );

  // 根据路径生成面包屑
  const getBreadcrumbItems = () => {
    const items = [
      { href: "/", label: t("breadcrumbHome") },
    ];

    if (!pathname) return items;

    if (pathname === "/manage-scripts") {
      items.push({ href: "/manage-scripts", label: t("breadcrumbScripts") });
    } else if (pathname === "/data-analysis") {
      items.push({ href: "/data-analysis", label: t("breadcrumbAnalysis") });
    } else if (pathname.startsWith("/view-execution-result")) {
      items.push({ href: "/view-execution-result", label: t("breadcrumbResults") });
    }

    return items;
  };

  const breadcrumbItems = getBreadcrumbItems();

  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <nav className={cn("flex items-center space-x-1 text-sm text-muted-foreground", className)}>
      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={item.href}>
          {index > 0 && <ChevronRight className="h-4 w-4" />}
          {index === breadcrumbItems.length - 1 ? (
            <span className="font-medium text-foreground">{item.label}</span>
          ) : (
            <Link
              href={item.href}
              className="hover:text-foreground transition-colors duration-200"
            >
              {item.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

// 主导航栏组件
export default function MainNavigation({ className }: NavigationProps) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const t = useCallback(
    (key: DashboardTranslationKeys): string => {
      const langTranslations =
        dashboardTranslations[language] || dashboardTranslations.en;
      return langTranslations[key as keyof typeof langTranslations] || key;
    },
    [language],
  );

  // 检查是否为活跃路径
  const isActivePath = (href: string) => {
    if (!pathname) return false;
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  // 导航项组件
  const NavigationItem = ({ item, isMobile = false }: { item: typeof navigationItems[0], isMobile?: boolean }) => {
    const isActive = isActivePath(item.href);
    const Icon = item.icon;

    const baseClasses = isMobile
      ? "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 w-full text-left"
      : "flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium";

    const activeClasses = isActive
      ? "bg-primary text-primary-foreground shadow-md"
      : "text-muted-foreground hover:text-foreground hover:bg-muted/50";

    const content = (
      <>
        <Icon className={cn("h-5 w-5", isMobile && "flex-shrink-0")} />
        <span>{t(item.labelKey)}</span>
        {isActive && !isMobile && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
        )}
      </>
    );

    if (isMobile) {
      return (
        <Link
          href={item.href}
          className={cn(baseClasses, activeClasses)}
          onClick={() => setMobileMenuOpen(false)}
        >
          {content}
        </Link>
      );
    }

    return (
      <Link
        href={item.href}
        className={cn("relative", baseClasses, activeClasses)}
        title={item.description}
      >
        {content}
      </Link>
    );
  };

  return (
    <>
      {/* 桌面端导航 */}
      <nav className={cn("hidden md:flex items-center space-x-1", className)}>
        {navigationItems.map((item) => (
          <NavigationItem key={item.href} item={item} />
        ))}
      </nav>

      {/* 移动端导航 */}
      <div className="md:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <Menu className="h-5 w-5" />
              <span className="sr-only">打开导航菜单</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="px-6 py-4 border-b">
              <SheetTitle className="text-left">{t("systemTitle")}</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col py-4">
              {navigationItems.map((item) => (
                <NavigationItem key={item.href} item={item} isMobile />
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
} 