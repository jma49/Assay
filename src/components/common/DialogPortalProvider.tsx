"use client";

import React from "react";

// 创建一个专门的容器来渲染对话框
export function DialogPortalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* 主要内容区域 */}
      <div className="relative z-0">{children}</div>
      
      {/* 对话框渲染层 */}
      <div id="dialog-portal-root" className="relative z-[100]" />
    </>
  );
} 