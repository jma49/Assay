"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/utils";

/**
 * A modal panel whose content brings its own header and actions. Built on
 * Radix Dialog for focus trapping, Escape and screen-reader semantics.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Read by screen readers; the content carries its own visible header. */
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/35" />
        <DialogPrimitive.Content
          className={cn(
            "bg-card fixed top-[12vh] left-1/2 z-50 max-h-[76vh] w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 overflow-y-auto rounded-xl border shadow-md outline-none duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            className,
          )}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">{description ?? title}</DialogPrimitive.Description>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
