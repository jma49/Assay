import type { CSSProperties } from "react";

/**
 * Section themes named after editor themes the app ships (Settings → editor
 * theme), so the "Editor theme" tag under each demo is accurate. Each theme
 * overrides the --l-* variables that every demo panel reads.
 */
export interface SectionTheme {
  name: string;
  vars: CSSProperties;
}

const theme = (name: string, v: Record<string, string>): SectionTheme => ({
  name,
  vars: Object.fromEntries(Object.entries(v).map(([k, val]) => [`--l-${k}`, val])) as CSSProperties,
});

export const SECTION_THEMES: SectionTheme[] = [
  theme("Solarized Light", {
    bg: "#fdf6e3",
    fg: "#073642",
    muted: "#657b83",
    panel: "#eee8d5",
    line: "rgba(88, 110, 117, 0.2)",
    "code-bg": "#fbf3db",
    accent: "#b58900",
    success: "#6c8a00",
    attention: "#cb4b16",
    failure: "#dc322f",
  }),
  theme("Nord", {
    bg: "#2e3440",
    fg: "#eceff4",
    muted: "#a7b1c2",
    panel: "#3b4252",
    line: "rgba(216, 222, 233, 0.12)",
    "code-bg": "#333a47",
    accent: "#88c0d0",
    success: "#a3be8c",
    attention: "#ebcb8b",
    failure: "#d08770",
  }),
  theme("Solarized Dark", {
    bg: "#002b36",
    fg: "#eee8d5",
    muted: "#93a1a1",
    panel: "#073642",
    line: "rgba(147, 161, 161, 0.16)",
    "code-bg": "#00232d",
    accent: "#d6a21a",
    success: "#94ad1f",
    attention: "#e0703a",
    failure: "#ef5b56",
  }),
];
