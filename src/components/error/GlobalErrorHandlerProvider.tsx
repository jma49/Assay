'use client';

import { useEffect, ReactNode } from 'react';
import { setupGlobalErrorHandlers } from '@/lib/utils/error-utils';

interface GlobalErrorHandlerProviderProps {
  children: ReactNode;
}

export function GlobalErrorHandlerProvider({ children }: GlobalErrorHandlerProviderProps) {
  useEffect(() => {
    setupGlobalErrorHandlers();

    const handleOnline = () => {
      console.log('[GlobalErrorHandler] Network connection restored');
    };

    const handleOffline = () => {
      console.warn('[GlobalErrorHandler] Network connection lost');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if ('performance' in window && 'mark' in window.performance) {
      window.performance.mark('app-start');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return <>{children}</>;
} 