import type { CheckDetail } from "@/contracts/checks";
import { formatDateTime } from "@/lib/utils/datetime";
import { cn } from "@/lib/utils/utils";
import { Sparkline } from "../Sparkline";
import { OUTCOME_LABEL } from "../status";
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
    <div className="grid overflow-hidden rounded-sm border border-line-2 bg-white/30 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="border-b border-line p-4 lg:border-r lg:border-b-0">
        <div className="mb-2.5 flex justify-between text-caption text-ink-3">
          <span className="lead">{t.lastRuns(history.length)}</span>
          <span>{t.now}</span>
        </div>
        {/* Always 30 slots, newest on the right, so the strip reads the same for every check. */}
        <div className="run-strip">
          {Array.from({ length: 30 - history.length }, (_, i) => (
            <span key={`empty-${i}`} className="run-frame run-frame-empty" />
          ))}
          {history.map((point, i) => (
            <span
              key={i}
              title={`${formatDateTime(point.at, language)} · ${point.outcome === "error" ? OUTCOME_LABEL.error[language] : t.rows(point.rowCount)}`}
              className={cn("run-frame", `run-frame-${point.outcome}`)}
            />
          ))}
        </div>
      </div>
      <div className="p-4">
        <p className="lead mb-2 text-ink-3">{t.rowsFlagged}</p>
        <div className="flex items-end justify-between gap-4">
          <dl className="flex gap-5">
            {[
              [t.now, state?.outcome === "error" ? "—" : state?.rowCount ?? "—"],
              [t.previous, previousRows],
              [t.high, high],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dd className="text-title leading-tight font-semibold text-ink tabular-nums">{value}</dd>
                <dt className="text-caption text-ink-3">{label}</dt>
              </div>
            ))}
          </dl>
          <Sparkline points={history} outcome={state?.outcome ?? "clean"} width={120} height={36} />
        </div>
      </div>
    </div>
  );
}
