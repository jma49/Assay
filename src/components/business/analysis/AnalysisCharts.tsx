"use client";

import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS } from "./chart-colors";

const tooltipStyle = {
  contentStyle: {
    backgroundColor: CHART_COLORS.background,
    border: `1px solid ${CHART_COLORS.border}`,
    borderRadius: "6px",
    fontSize: "13px",
  },
  labelStyle: { color: "var(--foreground)", fontWeight: 500 },
};

const legendStyle = { paddingTop: "16px", fontSize: "13px" };

export function StatusPieChart({
  success,
  failed,
  attention,
  labels,
}: {
  success: number;
  failed: number;
  attention: number;
  labels: { success: string; failed: string; attention: string };
}) {
  const total = success + failed + attention || 1;
  const data = [
    { name: labels.success, value: success, color: CHART_COLORS.chartGreen },
    { name: labels.failed, value: failed, color: CHART_COLORS.chartRed },
    { name: labels.attention, value: attention, color: CHART_COLORS.chartOrange },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={115}
          paddingAngle={2}
          dataKey="value"
          stroke="var(--background)"
          strokeWidth={2}
          // Sectors stay empty while requestAnimationFrame is paused (background tabs).
          isAnimationActive={false}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [
            `${value} (${((value / total) * 100).toFixed(1)}%)`,
            name,
          ]}
          {...tooltipStyle}
        />
        <Legend wrapperStyle={legendStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({
  data,
  labels,
}: {
  data: { date: string; executions: number; successes: number; failures: number }[];
  labels: { date: string; total: string; success: string; failed: string };
}) {
  const series = [
    { key: "executions", name: labels.total, color: CHART_COLORS.chartBlue },
    { key: "successes", name: labels.success, color: CHART_COLORS.chartGreen },
    { key: "failures", name: labels.failed, color: CHART_COLORS.chartRed },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 2" stroke={CHART_COLORS.border} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(value) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }}
          stroke={CHART_COLORS.muted}
          fontSize={12}
          tickMargin={8}
        />
        <YAxis stroke={CHART_COLORS.muted} fontSize={12} tickMargin={8} allowDecimals={false} />
        <Tooltip
          labelFormatter={(value) => `${labels.date}: ${new Date(value).toLocaleDateString()}`}
          {...tooltipStyle}
        />
        <Legend wrapperStyle={legendStyle} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
