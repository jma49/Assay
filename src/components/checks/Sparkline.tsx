import type { RunPoint } from "@/contracts/checks";
import type { RunOutcome } from "@/domain/run";

const STROKE: Record<RunOutcome, string> = {
  error: "var(--failure)",
  issues: "var(--attention)",
  clean: "var(--success)",
};

/**
 * Rows flagged over the recent runs: an area under a line, ending in a dot.
 * A run that errored has no row count, so it is drawn at zero on a dashed line.
 */
export function Sparkline({
  points,
  outcome,
  width = 96,
  height = 26,
  className,
}: {
  points: RunPoint[];
  outcome: RunOutcome;
  width?: number;
  height?: number;
  className?: string;
}) {
  const pad = 3;
  // One run is a dot, not a trend.
  if (points.length < 2) return <span className="text-caption text-muted-foreground">—</span>;
  const values = points.map((p) => (p.outcome === "error" ? 0 : p.rowCount));
  const max = Math.max(1, ...values);
  const x = (i: number) => (points.length === 1 ? width / 2 : pad + (i * (width - pad * 2)) / (points.length - 1));
  const y = (v: number) => height - pad - (v / max) * (height - pad * 2);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const area = `${line}L${x(values.length - 1).toFixed(1)},${height - pad}L${x(0).toFixed(1)},${height - pad}Z`;
  const color = STROKE[outcome];
  const allErrors = points.every((p) => p.outcome === "error");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      {allErrors ? (
        <line x1={pad} x2={width - pad} y1={height / 2} y2={height / 2} stroke={color} strokeDasharray="3 3" />
      ) : (
        <>
          <path d={area} fill={color} opacity={0.12} />
          <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
        </>
      )}
      <circle cx={x(values.length - 1)} cy={allErrors ? height / 2 : y(values.at(-1) ?? 0)} r={2.5} fill={color} />
    </svg>
  );
}
