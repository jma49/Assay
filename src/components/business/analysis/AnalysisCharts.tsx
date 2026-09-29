"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { OUTCOME_COLOR, OUTCOME_LABEL } from "@/components/checks/status";
import type { RunOutcome } from "@/domain/run";
import { formatDayKey } from "@/lib/utils/datetime";
import type { DailyTrendPoint, OutcomeCounts } from "./analytics";

// Chart ink resolves to the design tokens, so it follows light and dark mode.
const INK = { text: "var(--foreground)", muted: "var(--muted-foreground)", grid: "var(--border)", surface: "var(--popover)" };

const tooltipStyle = {
  contentStyle: {
    backgroundColor: INK.surface,
    border: `1px solid ${INK.grid}`,
    borderRadius: "var(--radius-lg)",
    fontSize: "12px",
    color: INK.text,
  },
  labelStyle: { color: INK.text, fontWeight: 500 },
  itemStyle: { padding: 0 },
};

const legendStyle = { paddingTop: "12px", fontSize: "12px", color: INK.muted };
const OUTCOMES: RunOutcome[] = ["error", "issues", "clean"];
// Series names in the legend stay neutral text; the marker carries the colour.
const legendText = (value: string) => <span style={{ color: INK.muted }}>{value}</span>;

export function StatusPieChart({ counts, language }: { counts: OutcomeCounts; language: "en" | "zh" }) {
  const total = counts.error + counts.issues + counts.clean || 1;
  const data = OUTCOMES.map((outcome) => ({ name: OUTCOME_LABEL[outcome][language], value: counts[outcome], color: OUTCOME_COLOR[outcome] }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="55%"
          outerRadius="85%"
          paddingAngle={1}
          dataKey="value"
          stroke="var(--card)"
          strokeWidth={2}
          // Sectors stay empty while requestAnimationFrame is paused (background tabs).
          isAnimationActive={false}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number, name: string) => [`${value} (${((value / total) * 100).toFixed(1)}%)`, name]} {...tooltipStyle} />
        <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} formatter={legendText} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/**
 * Runs per day as stacked bars, clean at the base and errors on top. Days are
 * discrete counts, so bars rather than a line, which would suggest values
 * between days; the stack's height is the day's total.
 */
export function DailyTrendChart({ data, language, allRunsLabel }: { data: DailyTrendPoint[]; language: "en" | "zh"; allRunsLabel: string }) {
  const totals = new Map(data.map((point) => [point.date, point.runs]));
  const stack: RunOutcome[] = ["clean", "issues", "error"];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="2 2" stroke={INK.grid} vertical={false} />
        <XAxis dataKey="date" tickFormatter={(key: string) => formatDayKey(key, language)} stroke={INK.muted} fontSize={12} tickMargin={8} minTickGap={16} />
        <YAxis stroke={INK.muted} fontSize={12} tickMargin={8} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          labelFormatter={(key: string) => `${formatDayKey(key, language, { weekday: true })} · ${allRunsLabel} ${totals.get(key) ?? 0}`}
          {...tooltipStyle}
        />
        {/* Listed in the same order as the outcomes chart (broken, issues, clean), not the stacking order. */}
        <Legend
          wrapperStyle={legendStyle}
          iconSize={8}
          formatter={legendText}
          payload={OUTCOMES.map((outcome) => ({ id: outcome, value: OUTCOME_LABEL[outcome][language], type: "circle" as const, color: OUTCOME_COLOR[outcome] }))}
        />
        {stack.map((outcome) => (
          <Bar
            key={outcome}
            dataKey={outcome}
            name={OUTCOME_LABEL[outcome][language]}
            stackId="runs"
            fill={OUTCOME_COLOR[outcome]}
            // A surface-coloured edge keeps the stacked segments apart.
            stroke="var(--card)"
            strokeWidth={1}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
