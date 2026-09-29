"use client";

import { CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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

export function TrendLineChart({ data, language, allRunsLabel }: { data: DailyTrendPoint[]; language: "en" | "zh"; allRunsLabel: string }) {
  const series = [
    { key: "runs", name: allRunsLabel, color: INK.muted },
    ...OUTCOMES.map((outcome) => ({ key: outcome, name: OUTCOME_LABEL[outcome][language], color: OUTCOME_COLOR[outcome] })),
  ];
  const format = (key: string) => formatDayKey(key, language);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 2" stroke={INK.grid} vertical={false} />
        <XAxis dataKey="date" tickFormatter={format} stroke={INK.muted} fontSize={12} tickMargin={8} minTickGap={16} />
        <YAxis stroke={INK.muted} fontSize={12} tickMargin={8} allowDecimals={false} />
        <Tooltip labelFormatter={(key: string) => formatDayKey(key, language, { weekday: true })} {...tooltipStyle} />
        <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} formatter={legendText} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={s.key === "runs" ? 1.5 : 2}
            strokeDasharray={s.key === "runs" ? "4 3" : undefined}
            dot={data.length <= 31 ? { r: 2.5, fill: s.color, strokeWidth: 0 } : false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
