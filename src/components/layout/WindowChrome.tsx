"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAppShellState } from "@/components/layout/app-shell-state";

/** The page's main actions, filters and search, shown in the top bar. Push items right with `ml-auto`. */
export function WindowToolbar({ children }: { children: ReactNode }) {
  const { toolbarSlot } = useAppShellState();
  return toolbarSlot ? createPortal(children, toolbarSlot) : null;
}

/** A one-line summary next to the page title, like "11 checks". */
export function WindowStatusBar({ children }: { children: ReactNode }) {
  const { statusSlot } = useAppShellState();
  return statusSlot ? createPortal(children, statusSlot) : null;
}
