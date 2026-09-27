import type { CheckDetail } from "@/contracts/checks";
import { formatDateTime } from "@/lib/utils/datetime";
import { cn } from "@/lib/utils/utils";
import { Sparkline } from "../Sparkline";
import type { Copy } from "./copy";

/** The last 30 runs as a strip, and how many rows the check flags now, last time and at most. */
export function RecentRuns({
  history,
  state,
  t,
  language,
}: {
  history: CheckDetail["history"];
  state: CheckDetail["state"];
  t: Copy;
  language: "en" | "zh";
}) {
  // Runs that errored have no row count, so they are left out of the numbers.
  const counted = history.filter((p) => p.outcome !== "error");
  const high: number | string = counted.length ? Math.max(...counted.map((p) => p.rowCount)) : "—";
  const previousPoint = history.length > 1 ? history[history.length - 2] : null;
  const previousRows: number | string = previousPoint && previousPoint.outcome !== "error" ? previousPoint.rowCount : "—";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="rounded-xl bg-card p-4 shadow-border">
        <div className="mb-2.5 flex justify-between text-[12px] text-muted-foreground">
          <span>{t.lastRuns(history.length)}</span>
          <span>{t.now}</span>
        </div>
        {/* Always 30 slots, newest on the right, so the strip reads the same for every check. */}
        <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-[3px]">
          {Array.from({ length: 30 - history.length }, (_, i) => (
            <span key={`empty-${i}`} className="h-7 rounded-[3px] bg-muted" />
          ))}
          {history.map((point, i) => (
            <span
              key={i}
              title={`${formatDateTime(point.at, language)} · ${point.outcome === "error" ? t.queryError : t.rows(point.rowCount)}`}
              className={cn(
                "h-7 rounded-[3px]",
                point.outcome === "error" ? "bg-failure" : point.outcome === "issues" ? "bg-attention" : "bg-success",
              )}
            />
          ))}
        </div>
      </div>
      <div className="rounded-xl bg-card p-4 shadow-border">
        <p className="mb-2 text-[12px] text-muted-foreground">{t.rowsFlagged}</p>
        <div className="flex items-end justify-between gap-4">
          <dl className="flex gap-5">
            {[
              [t.now, state?.outcome === "error" ? "—" : state?.rowCount ?? "—"],
              [t.previous, previousRows],
              [t.high, high],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dd className="text-[20px] leading-tight font-semibold tabular-nums">{value}</dd>
                <dt className="text-[12px] text-muted-foreground">{label}</dt>
              </div>
            ))}
          </dl>
          <Sparkline points={history} outcome={state?.outcome ?? "clean"} width={120} height={36} />
        </div>
      </div>
    </div>
  );
}
