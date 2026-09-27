"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface AppShellState {
  /** Where pages portal their actions (top bar) and one-line summary. */
  toolbarSlot: HTMLElement | null;
  statusSlot: HTMLElement | null;
  setToolbarSlot: (element: HTMLElement | null) => void;
  setStatusSlot: (element: HTMLElement | null) => void;
}

const AppShellContext = createContext<AppShellState | null>(null);

export function AppShellStateProvider({ children }: { children: ReactNode }) {
  const [toolbarSlot, setToolbarSlot] = useState<HTMLElement | null>(null);
  const [statusSlot, setStatusSlot] = useState<HTMLElement | null>(null);
  const value = useMemo(() => ({ toolbarSlot, statusSlot, setToolbarSlot, setStatusSlot }), [toolbarSlot, statusSlot]);
  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useAppShellState() {
  const state = useContext(AppShellContext);
  if (!state) throw new Error("useAppShellState must be used inside AppShellStateProvider");
  return state;
}
