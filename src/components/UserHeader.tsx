"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { useCallback } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  dashboardTranslations,
  DashboardTranslationKeys,
} from "@/components/dashboard/types";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import MainNavigation, { Breadcrumb } from "@/components/ui/main-navigation";
import { RefreshCw } from "lucide-react";

export default function UserHeader() {
  const { user, isLoaded } = useUser();
  const { language, setLanguage } = useLanguage();

  // 翻译函数
  const t = useCallback(
    (key: DashboardTranslationKeys): string => {
      const langTranslations =
        dashboardTranslations[language] || dashboardTranslations.en;
      return langTranslations[key as keyof typeof langTranslations] || key;
    },
    [language],
  );

  // 语言切换函数
  const toggleLanguage = useCallback(() => {
    const newLanguage = language === "zh" ? "en" : "zh";
    console.log("切换语言:", language, "->", newLanguage);
    setLanguage(newLanguage);
  }, [language, setLanguage]);

  // 全局刷新函数
  const handleGlobalRefresh = useCallback(() => {
    // 触发页面刷新
    window.location.reload();
  }, []);

  if (!isLoaded) {
    return (
      <div className="bg-white shadow-sm border-b dark:bg-gray-900 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <div className="h-8 w-48 bg-gray-200 animate-pulse rounded dark:bg-gray-700"></div>
            <div className="flex items-center gap-4">
              <div className="h-8 w-24 bg-gray-200 animate-pulse rounded dark:bg-gray-700"></div>
              <div className="h-8 w-8 bg-gray-200 animate-pulse rounded-full dark:bg-gray-700"></div>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              <div className="h-8 w-8 bg-gray-200 animate-pulse rounded-full dark:bg-gray-700"></div>
              <div className="h-8 w-8 bg-gray-200 animate-pulse rounded-full dark:bg-gray-700"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm shadow-sm border-b dark:bg-gray-900/95 dark:border-gray-700 sticky top-0 z-40">
      <div className="flex items-center w-full">
        {/* 面包屑导航 - 整个header的最左侧 */}
        <div className="flex-shrink-0 pl-4 sm:pl-6 lg:pl-8">
          <Breadcrumb className="hidden lg:flex" />
        </div>
        
        {/* 主要内容区域 - 与页面内容完全对齐 */}
        <div className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex justify-between items-center">
              {/* 左侧：主导航 - 与Dashboard内容左对齐 */}
              <div className="flex items-center">
                <MainNavigation />
              </div>

              {/* 右侧：用户控件 - 与Dashboard内容右对齐 */}
              <div className="flex items-center space-x-4">
                {/* 用户信息 */}
                <div className="hidden lg:block text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {user.fullName ||
                      user.emailAddresses[0]?.emailAddress?.split("@")[0]}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user.emailAddresses[0]?.emailAddress}
                  </p>
                </div>

                {/* 用户头像 */}
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "h-8 w-8",
                      userButtonPopoverCard: "shadow-lg border",
                      userButtonPopoverActionButton:
                        "hover:bg-gray-50 dark:hover:bg-gray-800",
                    },
                  }}
                  afterSignOutUrl="/sign-in"
                  showName={false}
                />

                {/* 分割线 */}
                <div className="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>

                {/* 语言切换按钮 */}
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={toggleLanguage}
                  title={language === "zh" ? "Switch to English" : "切换到中文"}
                >
                  <span className="text-xs font-bold">
                    {language === "zh" ? "EN" : "中"}
                  </span>
                  <span className="sr-only">{t("changeLanguage")}</span>
                </Button>

                {/* 主题切换按钮 */}
                <ThemeToggle />

                {/* 全局刷新按钮 */}
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={handleGlobalRefresh}
                  title={language === "zh" ? "刷新数据" : "Refresh Data"}
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="sr-only">{language === "zh" ? "刷新数据" : "Refresh Data"}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
