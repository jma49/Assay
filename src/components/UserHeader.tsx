'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import { useCallback } from 'react';
import { useLanguage } from '@/components/ClientLayoutWrapper';
import { dashboardTranslations, DashboardTranslationKeys } from '@/components/dashboard/types';

export default function UserHeader() {
  const { user, isLoaded } = useUser();
  const { language } = useLanguage();

  // 翻译函数
  const t = useCallback((key: DashboardTranslationKeys): string => {
    const langTranslations = dashboardTranslations[language] || dashboardTranslations.en;
    return langTranslations[key as keyof typeof langTranslations] || key;
  }, [language]);

  if (!isLoaded) {
    return (
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="h-8 w-48 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-8 w-8 bg-gray-200 animate-pulse rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 7v10c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4V7M4 7l8-4 8 4M4 7h16M9 7v10M15 7v10" />
              </svg>
              <h1 className="text-xl font-semibold text-gray-900">
                {t('systemTitle')}
              </h1>
            </div>
            <div className="hidden md:block">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {t('authorizedAccess')}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">
                {user.fullName || user.emailAddresses[0]?.emailAddress?.split('@')[0]}
              </p>
              <p className="text-xs text-gray-500">
                {user.emailAddresses[0]?.emailAddress}
              </p>
            </div>
            
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                  userButtonPopoverCard: "shadow-lg border",
                  userButtonPopoverActionButton: "hover:bg-gray-50",
                }
              }}
              afterSignOutUrl="/sign-in"
              showName={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 