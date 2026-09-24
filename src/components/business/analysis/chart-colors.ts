// Chart colors resolve to the design tokens, so they follow light and dark mode.
export const CHART_COLORS = {
  success: "var(--success)",
  failed: "var(--failure)",
  attention_needed: "var(--attention)",
  primary: "var(--foreground)",
  secondary: "var(--muted-foreground)",
  accent: "var(--info)",
  muted: "var(--muted-foreground)",
  border: "var(--border)",
  background: "var(--background)",

  lightBlue: "var(--muted)",
  lightGreen: "color-mix(in srgb, var(--success) 10%, transparent)",
  lightRed: "color-mix(in srgb, var(--failure) 10%, transparent)",
  lightPurple: "var(--muted)",
  lightGray: "var(--muted)",

  chartBlue: "var(--foreground)",
  chartGreen: "var(--success)",
  chartRed: "var(--failure)",
  chartPurple: "var(--info)",
  chartOrange: "var(--attention)",
};
