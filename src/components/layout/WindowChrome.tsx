"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAppWindowState } from "@/components/layout/app-window-state";

/**
 * Page content for the window's unified toolbar (under the title bar), as in
 * Mac OS X: the page's main actions, filters and search. Push items right
 * with `ml-auto`.
 */
export function WindowToolbar({ children }: { children: ReactNode }) {
  const { toolbarSlot } = useAppWindowState();
  return toolbarSlot ? createPortal(children, toolbarSlot) : null;
}

/** A one-line summary in the window's status bar, like Finder's "11 items". */
export function WindowStatusBar({ children }: { children: ReactNode }) {
  const { statusSlot } = useAppWindowState();
  return statusSlot ? createPortal(children, statusSlot) : null;
}
