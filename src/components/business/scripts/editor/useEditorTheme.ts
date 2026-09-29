import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { okaidia } from "@uiw/codemirror-theme-okaidia";
import { githubLight } from "@uiw/codemirror-theme-github";
import { dracula } from "@uiw/codemirror-theme-dracula";
import { nord } from "@uiw/codemirror-theme-nord";
import { materialLight, materialDark } from "@uiw/codemirror-theme-material";
import { eclipse } from "@uiw/codemirror-theme-eclipse";
import { tokyoNight } from "@uiw/codemirror-theme-tokyo-night";
import { solarizedLight, solarizedDark } from "@uiw/codemirror-theme-solarized";

const THEMES = {
  eclipse,
  githubLight,
  materialLight,
  nord,
  solarizedLight,
  tokyoNight,
  okaidia,
  dracula,
  materialDark,
  solarizedDark,
};

const isTheme = (name: unknown): name is keyof typeof THEMES => typeof name === "string" && name in THEMES;

const STORAGE_KEY = "editor-theme";
const fallbackFor = (appTheme: string | undefined): keyof typeof THEMES => (appTheme === "dark" ? "tokyoNight" : "eclipse");

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
 * localStorage and announced with an `editorThemeChange` event), else one
 * that matches the app's light or dark mode.
 */
export function useEditorTheme() {
  const { theme: appTheme } = useTheme();
  const saved = useSyncExternalStore(subscribe, readSaved, () => null);
  const name = saved ?? fallbackFor(appTheme);

  // Without a saved choice, remember the one matching the app's mode.
  useEffect(() => {
    if (readSaved() === null) localStorage.setItem(STORAGE_KEY, fallbackFor(appTheme));
  }, [appTheme]);

  return useMemo(() => THEMES[name] ?? (appTheme === "dark" ? tokyoNight : eclipse), [name, appTheme]);
}
