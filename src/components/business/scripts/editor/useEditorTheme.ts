import { useEffect, useMemo, useState } from "react";
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

/**
 * The editor's colour theme: the one picked in EditorThemeSettings (kept in
 * localStorage and announced with an `editorThemeChange` event), else one
 * that matches the app's light or dark mode.
 */
export function useEditorTheme() {
  const { theme: appTheme } = useTheme();
  const [name, setName] = useState<keyof typeof THEMES>("eclipse");

  useEffect(() => {
    const saved = localStorage.getItem("editor-theme");
    if (isTheme(saved)) {
      setName(saved);
    } else {
      const fallback = appTheme === "dark" ? "tokyoNight" : "eclipse";
      setName(fallback);
      localStorage.setItem("editor-theme", fallback);
    }
  }, [appTheme]);

  useEffect(() => {
    const onChange = (event: Event) => {
      const next = (event as CustomEvent<{ theme?: unknown }>).detail?.theme;
      if (isTheme(next)) setName(next);
    };
    window.addEventListener("editorThemeChange", onChange);
    return () => window.removeEventListener("editorThemeChange", onChange);
  }, []);

  return useMemo(() => THEMES[name] ?? (appTheme === "dark" ? tokyoNight : eclipse), [name, appTheme]);
}
