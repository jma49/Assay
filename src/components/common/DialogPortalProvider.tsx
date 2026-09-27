"use client";

import React from "react";

export function DialogPortalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="relative z-0">{children}</div>
      
      <div id="dialog-portal-root" className="relative z-[100]" />
    </>
  );
} 