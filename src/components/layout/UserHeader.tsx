"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/components/common/LanguageProvider";

import { Button } from "@/components/ui/button";
import MainNavigation, { Breadcrumb } from "@/components/ui/main-navigation";
import { RefreshCw, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { useTheme } from "next-themes";

export default function UserHeader() {
  const { user, isLoaded } = useUser();
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [hasDialog, setHasDialog] = useState(false);

  // 语言切换函数
  const toggleLanguage = useCallback(() => {
    const newLanguage = language === "zh" ? "en" : "zh";
    setLanguage(newLanguage);
  }, [language, setLanguage]);

  // 主题切换函数
  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  // 全局刷新函数
  const handleGlobalRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  // 检测弹窗状态
  useEffect(() => {
    const checkDialog = () => {
      // 检查页面中是否有弹窗元素
      const dialogSelectors = [
        '[role="dialog"]',                              // Radix UI Dialog
        '[data-state="open"]',                          // Radix UI open state
        '.dialog-overlay',                              // 自定义弹窗覆盖层
        '[data-slot="dialog-portal"]',                  // 我们系统的dialog portal
        '[data-slot="dialog-content"]',                 // 我们系统的dialog content
        '.fixed[style*="z-index: 50"]',                 // 固定定位高z-index元素
        '.AlertDialog',                                 // AlertDialog组件
        '.Dialog',                                      // Dialog组件
        'div[data-radix-dialog-overlay]',               // Radix Dialog overlay
        'div[data-radix-dialog-content]'                // Radix Dialog content
      ];
      
      let hasOpenDialog = false;
      
      // 检查所有可能的弹窗选择器
      for (const selector of dialogSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          // 进一步检查元素是否真的可见
          for (const element of elements) {
            const style = window.getComputedStyle(element);
            const isVisible = style.display !== 'none' && 
                             style.visibility !== 'hidden' && 
                             style.opacity !== '0';
            if (isVisible) {
              hasOpenDialog = true;
              break;
            }
          }
          if (hasOpenDialog) break;
        }
      }
      
      setHasDialog(hasOpenDialog);
    };

    // 初始检查
    checkDialog();

    // 创建 MutationObserver 监听 DOM 变化
    const observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      mutations.forEach((mutation) => {
        // 检查是否有节点添加或删除
        if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
          shouldCheck = true;
        }
        // 检查属性变化（特别是 data-state、role、style）
        if (mutation.type === 'attributes') {
          const target = mutation.target as Element;
          if (target.hasAttribute('data-state') || 
              target.hasAttribute('role') ||
              target.hasAttribute('data-slot') ||
              mutation.attributeName === 'style') {
            shouldCheck = true;
          }
        }
      });
      
      if (shouldCheck) {
        // 小延迟确保DOM更新完成
        setTimeout(checkDialog, 10);
      }
    });

    // 开始观察
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['role', 'data-state', 'class', 'style', 'data-slot']
    });

    // 也监听窗口焦点变化，有时弹窗状态在此时更新
    const handleFocusChange = () => {
      setTimeout(checkDialog, 100);
    };
    
    window.addEventListener('focus', handleFocusChange);
    window.addEventListener('blur', handleFocusChange);

    return () => {
      observer.disconnect();
      window.removeEventListener('focus', handleFocusChange);
      window.removeEventListener('blur', handleFocusChange);
    };
  }, []);

  // 优化的滚动监听 - 添加防抖和平滑检测
  useEffect(() => {
    let ticking = false;
    let timeoutId: NodeJS.Timeout;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const threshold = 30;
          
          // 清除之前的超时
          clearTimeout(timeoutId);
          
          // 添加小延迟避免频繁切换
          timeoutId = setTimeout(() => {
            const shouldBeScrolled = scrollY > threshold;
            setIsScrolled(shouldBeScrolled);
          }, 50);
          
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, []);

  if (!isLoaded) {
    return (
      <>
        {/* 第一行加载状态 */}
        <div className="h-11 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
          <div className="w-full max-w-7xl mx-auto px-4 flex items-center justify-between">
            <div className="h-4 w-64 bg-gray-200 animate-pulse rounded dark:bg-gray-700"></div>
            <div className="flex items-center gap-3">
              <div className="h-5 w-16 bg-gray-200 animate-pulse rounded dark:bg-gray-700"></div>
              <div className="h-6 w-6 bg-gray-200 animate-pulse rounded-full dark:bg-gray-700"></div>
            </div>
          </div>
        </div>
        {/* 第二行加载状态 - 根据弹窗状态决定是否sticky */}
        <div className={cn(
          "h-11 flex items-center bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800",
          !hasDialog && "sticky top-0 z-[60]"
        )}>
          <div className="w-full max-w-7xl mx-auto px-4">
            <div className="h-4 w-80 bg-gray-200 animate-pulse rounded dark:bg-gray-700"></div>
          </div>
        </div>
      </>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      {/* 第一行：面包屑和用户信息 - 可以被内容覆盖 */}
      <div className="h-11 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 relative">
        {/* 面包屑容器 - 完全左对齐 */}
        <div className="absolute left-0 top-0 h-11 flex items-center px-4 z-10">
          <Breadcrumb />
        </div>

        {/* 主要内容容器 */}
        <div className="w-full max-w-7xl mx-auto px-4 h-full flex items-center justify-end">
          {/* 右侧：用户信息和控件 */}
          <div className="flex items-center gap-3">
            {/* 用户信息 - 只显示用户名 */}
            <div className="hidden sm:flex items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {user.fullName || user.emailAddresses[0]?.emailAddress?.split("@")[0]}
              </span>
            </div>

            {/* 用户头像 */}
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-6 w-6",
                  userButtonPopoverCard: "shadow-lg border",
                },
              }}
              afterSignOutUrl="/sign-in"
              showName={false}
            />

            {/* 控件组 */}
            <div className="flex items-center gap-1 ml-3 pl-3 border-l border-gray-200 dark:border-gray-700">
              {/* 语言切换 - 不显示地球图标 */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={toggleLanguage}
              >
                {language === "zh" ? "EN" : "中"}
              </Button>

              {/* 主题切换 */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={toggleTheme}
              >
                {theme === "dark" ? (
                  <Sun className="h-3.5 w-3.5" />
                ) : (
                  <Moon className="h-3.5 w-3.5" />
                )}
              </Button>

              {/* 刷新按钮 */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={handleGlobalRefresh}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 第二行：主导航 - 根据弹窗状态决定是否sticky */}
      <div className={cn(
        "h-11 flex items-center bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800",
        !hasDialog && "sticky top-0 z-[60]"
      )}>
        <div className="w-full max-w-7xl mx-auto px-4 flex items-center justify-between">
          {/* 主导航 */}
          <MainNavigation />

          {/* 滚动时显示的紧凑控件 - 只显示用户名 */}
          <div 
            className={cn(
              "flex items-center gap-2 will-change-transform transition-all duration-200 ease-out",
              isScrolled && !hasDialog ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"
            )}
          >
            {/* 只显示用户名 */}
            <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
              {user.fullName || user.emailAddresses[0]?.emailAddress?.split("@")[0]}
            </span>

            {/* 用户头像 */}
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-6 w-6",
                },
              }}
              afterSignOutUrl="/sign-in"
              showName={false}
            />

            {/* 紧凑控件 */}
            <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={toggleLanguage}
              >
                {language === "zh" ? "EN" : "中"}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={toggleTheme}
              >
                {theme === "dark" ? (
                  <Sun className="h-3 w-3" />
                ) : (
                  <Moon className="h-3 w-3" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={handleGlobalRefresh}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
