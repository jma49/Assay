import { useEffect, useMemo, useSyncExternalStore } from "react";
import { githubLight } from "@uiw/codemirror-theme-github";
import { nord } from "@uiw/codemirror-theme-nord";
import { materialLight } from "@uiw/codemirror-theme-material";
import { eclipse } from "@uiw/codemirror-theme-eclipse";
import { solarizedLight } from "@uiw/codemirror-theme-solarized";

// The app is light only, so the editor offers light themes; a saved dark one falls back to the default.
const THEMES = {
  eclipse,
  githubLight,
  materialLight,
  nord,
  solarizedLight,
};

const isTheme = (name: unknown): name is keyof typeof THEMES => typeof name === "string" && name in THEMES;

const STORAGE_KEY = "editor-theme";
const FALLBACK: keyof typeof THEMES = "eclipse";
function readSaved(): keyof typeof THEMES | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isTheme(saved) ? saved : null;
  } catch {
    return null;
  }
}

// EditorThemeSettings saves the choice, then announces it with this event.
function subscribe(onChange: () => void) {
  window.addEventListener("editorThemeChange", onChange);
  return () => window.removeEventListener("editorThemeChange", onChange);
}

/**
 * The editor's colour theme: the one picked in EditorThemeSettings (kept in
 * localStorage and announced with an `editorThemeChange` event), else Eclipse.
 */
export function useEditorTheme() {
  const saved = useSyncExternalStore(subscribe, readSaved, () => null);
  const name = saved ?? FALLBACK;

  // Without a saved choice, remember the default.
  useEffect(() => {
    if (readSaved() === null) localStorage.setItem(STORAGE_KEY, FALLBACK);
  }, []);

  return useMemo(() => THEMES[name], [name]);
}
