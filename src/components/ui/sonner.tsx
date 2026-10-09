"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      style={
        {
          // Growl "Smoke": translucent dark panels with white text.
          "--normal-bg": "rgba(20, 20, 22, 0.82)",
          "--normal-text": "#ffffff",
          "--normal-border": "transparent",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
