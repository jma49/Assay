"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const ZOOM_KEY = "assay-window-zoomed";

interface AppWindowState {
  shaded: boolean;
  zoomed: boolean;
  toggleShade: () => void;
  toggleZoom: () => void;
  /** Where pages portal their toolbar and status bar content. */
  toolbarSlot: HTMLElement | null;
  statusSlot: HTMLElement | null;
  setToolbarSlot: (element: HTMLElement | null) => void;
  setStatusSlot: (element: HTMLElement | null) => void;
}

const AppWindowContext = createContext<AppWindowState | null>(null);

/** Collapse and zoom state of the app window, shared by its buttons and the Window menu. */
export function AppWindowStateProvider({ children }: { children: ReactNode }) {
  const [shaded, setShaded] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [toolbarSlot, setToolbarSlot] = useState<HTMLElement | null>(null);
  const [statusSlot, setStatusSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    try {
      setZoomed(localStorage.getItem(ZOOM_KEY) === "1");
    } catch {
      // Storage blocked: the window just starts unzoomed.
    }
  }, []);

  const toggleShade = useCallback(() => setShaded((value) => !value), []);
  const toggleZoom = useCallback(() => {
    setZoomed((current) => {
      const next = !current;
      try {
        localStorage.setItem(ZOOM_KEY, next ? "1" : "0");
      } catch {
        // Storage blocked: the zoom still applies to this visit.
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ shaded, zoomed, toggleShade, toggleZoom, toolbarSlot, statusSlot, setToolbarSlot, setStatusSlot }),
    [shaded, zoomed, toggleShade, toggleZoom, toolbarSlot, statusSlot],
  );
  return <AppWindowContext.Provider value={value}>{children}</AppWindowContext.Provider>;
}

export function useAppWindowState() {
  const state = useContext(AppWindowContext);
  if (!state) throw new Error("useAppWindowState must be used inside AppWindowStateProvider");
  return state;
}
