"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/utils";

/**
 * A Mac OS X sheet: a modal panel that slides down from the top of the
 * window instead of popping up in the middle of the screen. Built on Radix
 * Dialog for focus trapping, Escape and screen-reader semantics.
 */
export function AquaSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Read by screen readers; the sheet's content carries its own visible header. */
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="aqua-sheet-overlay fixed inset-0 z-50" />
        <DialogPrimitive.Content
          className={cn(
            "aqua-sheet fixed top-10 left-1/2 z-50 max-h-[calc(100vh-7rem)] w-[min(760px,calc(100vw-1rem))] -translate-x-1/2 overflow-y-auto outline-none",
            className,
          )}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="sr-only">{description}</DialogPrimitive.Description>
          ) : (
            <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
          )}
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
