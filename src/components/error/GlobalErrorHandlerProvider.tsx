'use client';

import { useEffect, ReactNode } from 'react';
import { setupGlobalErrorHandlers } from '@/lib/utils/error-utils';

interface GlobalErrorHandlerProviderProps {
  children: ReactNode;
}

/**
 * 全局错误处理提供者
 * 负责初始化全局错误监听器和错误处理机制
 */
export function GlobalErrorHandlerProvider({ children }: GlobalErrorHandlerProviderProps) {
  useEffect(() => {
    // 初始化全局错误处理器
    setupGlobalErrorHandlers();

    // 监听在线/离线状态变化
    const handleOnline = () => {
      console.log('[GlobalErrorHandler] Network connection restored');
    };

    const handleOffline = () => {
      console.warn('[GlobalErrorHandler] Network connection lost');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 初始化性能监控
    if ('performance' in window && 'mark' in window.performance) {
      window.performance.mark('app-start');
    }

    // 清理函数
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return <>{children}</>;
} 