"use client";

import React, { useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/utils";
import {
  Home,
  FileText,
  BarChart3,
  History,
  Menu,
  Search,
  ArrowRight,
  Users,
  Shield,
} from "lucide-react";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    href: "/manage-scripts/approvals",
    icon: Shield,
    labelKey: "navigationApprovals" as DashboardTranslationKeys,
    description: "管理脚本审批流程",
    requiresRole: ["admin", "manager"],
  },
  {
    href: "/admin/users",
    icon: Users,
    labelKey: "navigationUsers" as DashboardTranslationKeys,
    description: "管理用户角色和权限",
    requiresRole: ["admin"],
  },
  {
    href: "results-dialog",
    icon: History,
    labelKey: "navigationResults" as DashboardTranslationKeys,
    description: "查看详细执行结果",
    isDialog: true,
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
      { href: "/", label: "Dashboard" }, // 固定使用Dashboard，不使用翻译
    ];

    if (!pathname || pathname === "/") return items;

    if (pathname === "/manage-scripts") {
      items.push({ href: "/manage-scripts", label: t("breadcrumbScripts") });
    } else if (pathname === "/manage-scripts/approvals") {
      items.push({ href: "/manage-scripts", label: t("breadcrumbScripts") });
      items.push({ href: "/manage-scripts/approvals", label: t("navigationApprovals") });
    } else if (pathname === "/data-analysis") {
      items.push({ href: "/data-analysis", label: t("breadcrumbAnalysis") });
    } else if (pathname === "/admin/users") {
      items.push({ href: "/admin/users", label: t("navigationUsers") });
    } else if (pathname.startsWith("/view-execution-result")) {
      items.push({ href: "/view-execution-result", label: t("breadcrumbResults") });
    }

    return items;
  };

  const breadcrumbItems = getBreadcrumbItems();

  // 总是显示面包屑，即使只有Dashboard
  return (
    <nav className={cn("flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400", className)}>
      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={item.href}>
          {index > 0 && <span className="mx-1 text-gray-400 dark:text-gray-500">/</span>}
          {index === breadcrumbItems.length - 1 ? (
            <span className="font-medium text-gray-900 dark:text-gray-100">{item.label}</span>
          ) : (
            <Link
              href={item.href}
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
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
  const [resultsDialogOpen, setResultsDialogOpen] = React.useState(false);

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
    // 精确匹配，避免approvals页面选中scripts
    if (href === "/manage-scripts") {
      return pathname === "/manage-scripts";
    }
    return pathname.startsWith(href);
  };

  // 导航项组件
  const NavigationItem = ({ item, isMobile = false }: { item: typeof navigationItems[0] & { isDialog?: boolean }, isMobile?: boolean }) => {
    const isActive = isActivePath(item.href);
    const Icon = item.icon;

    const baseClasses = isMobile
      ? "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 w-full text-left"
      : "relative flex items-center space-x-2 px-3 py-2 transition-all duration-200 text-sm font-medium";

    const activeClasses = isActive
      ? "text-gray-900 dark:text-gray-100"
      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100";

    const content = (
      <>
        <Icon className={cn("h-4 w-4", isMobile && "flex-shrink-0")} />
        <span>{t(item.labelKey)}</span>
        {isActive && !isMobile && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-900 dark:bg-gray-100" />
        )}
      </>
    );

    // 如果是Results弹窗项
    if (item.isDialog) {
      if (isMobile) {
        return (
          <button
            className={cn(baseClasses, activeClasses)}
            onClick={() => {
              setResultsDialogOpen(true);
              setMobileMenuOpen(false);
            }}
          >
            {content}
          </button>
        );
      }

      return (
        <button
          className={cn("relative", baseClasses, activeClasses)}
          title={item.description}
          onClick={() => setResultsDialogOpen(true)}
        >
          {content}
        </button>
      );
    }

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

      {/* Results弹窗 */}
      <Dialog open={resultsDialogOpen} onOpenChange={setResultsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Search className="h-5 w-5 text-primary" />
              {language === "zh" ? "查看执行结果" : "View Execution Results"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <History className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">
                    {language === "zh" ? "执行历史记录" : "Execution History"}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {language === "zh" 
                      ? "所有的脚本执行结果都已整合到主页的Check History中，您可以在那里查看详细的执行记录、筛选状态和搜索特定脚本。" 
                      : "All script execution results have been integrated into the Check History section on the main page. You can view detailed execution records, filter by status, and search for specific scripts there."}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    setResultsDialogOpen(false);
                    window.location.href = "/#execution-history";
                  }}
                  className="group"
                >
                  {language === "zh" ? "前往 Check History" : "Go to Check History"}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setResultsDialogOpen(false)}
              >
                {language === "zh" ? "关闭" : "Close"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 