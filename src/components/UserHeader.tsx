'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import { useCallback } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { dashboardTranslations, DashboardTranslationKeys } from '@/components/dashboard/types';
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";

export default function UserHeader() {
  const { user, isLoaded } = useUser();
  const { language, setLanguage } = useLanguage();

  // 翻译函数
  const t = useCallback((key: DashboardTranslationKeys): string => {
    const langTranslations = dashboardTranslations[language] || dashboardTranslations.en;
    return langTranslations[key as keyof typeof langTranslations] || key;
  }, [language]);

  // 语言切换函数
  const toggleLanguage = useCallback(() => {
    const newLanguage = language === 'zh' ? 'en' : 'zh';
    console.log('切换语言:', language, '->', newLanguage);
    setLanguage(newLanguage);
  }, [language, setLanguage]);

  if (!isLoaded) {
    return (
      <div className="bg-white shadow-sm border-b dark:bg-gray-900 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-3">
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
    <div className="bg-white shadow-sm border-b dark:bg-gray-900 dark:border-gray-700">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 7v10c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4V7M4 7l8-4 8 4M4 7h16M9 7v10M15 7v10" />
              </svg>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {t('systemTitle')}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* 用户信息 */}
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {user.fullName || user.emailAddresses[0]?.emailAddress?.split('@')[0]}
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
                  userButtonPopoverActionButton: "hover:bg-gray-50 dark:hover:bg-gray-800",
                }
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
              title={language === 'zh' ? 'Switch to English' : '切换到中文'}
            >
              <span className="text-xs font-bold">
                {language === 'zh' ? 'EN' : '中'}
              </span>
              <span className="sr-only">{t('changeLanguage')}</span>
            </Button>
            
            {/* 主题切换按钮 */}
            <div className="flex items-center">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 