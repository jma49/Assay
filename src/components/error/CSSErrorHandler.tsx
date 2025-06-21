"use client";

import { useEffect } from "react";

export default function CSSErrorHandler() {
  useEffect(() => {
    // 只在开发环境中启用
    if (process.env.NODE_ENV !== "development") return;

    const processedUrls = new Set<string>();
    let isHandling = false;

    const handleCSSError = (event: Event) => {
      // 防止重复处理
      if (isHandling) return false;

      const target = event.target as HTMLLinkElement;

      if (target && target.tagName === "LINK" && target.rel === "stylesheet") {
        const url = target.href;

        // 检查是否是layout.css相关的404错误
        if (
          url.includes("/layout.css") ||
          url.includes("/_next/static/css/app/layout.css")
        ) {
          // 防止重复处理同一个URL
          if (processedUrls.has(url)) {
            event.preventDefault();
            event.stopPropagation();
            return false;
          }

          processedUrls.add(url);
          isHandling = true;

          console.warn(`拦截CSS 404错误: ${url}`);

          // 移除失败的link标签
          if (target.parentNode) {
            target.parentNode.removeChild(target);
          }

          // 防止事件传播和默认行为
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          // 重置处理标志
          setTimeout(() => {
            isHandling = false;
          }, 100);

          return false;
        }
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      if (
        error &&
        typeof error === "object" &&
        "name" in error &&
        "message" in error
      ) {
        const errorObj = error as {
          name: string;
          message: string;
          stack?: string;
        };
        if (
          errorObj.name === "ChunkLoadError" ||
          errorObj.message?.includes("CSS") ||
          errorObj.message?.includes("stylesheet") ||
          errorObj.message?.includes("_next/static/css")
        ) {
          console.warn("拦截CSS网络错误:", errorObj.message);
          event.preventDefault();
        }
      }
    };

    // 使用捕获阶段监听错误
    document.addEventListener("error", handleCSSError, {
      capture: true,
      passive: false,
    });
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    // 清理函数
    return () => {
      document.removeEventListener("error", handleCSSError, true);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
      processedUrls.clear();
    };
  }, []);

  return null;
}
