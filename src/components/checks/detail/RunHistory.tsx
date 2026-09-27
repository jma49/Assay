import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RunListItem } from "@/contracts/checks";
import { formatDateTime, formatRelative } from "@/lib/utils/datetime";
import { cn } from "@/lib/utils/utils";
import { OUTCOME_DOT, OUTCOME_LABEL } from "../status";
import type { Copy } from "./copy";

export function RunHistory({ runs, t, language }: { runs: RunListItem[]; t: Copy; language: "en" | "zh" }) {
  const router = useRouter();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b text-[12px] text-muted-foreground">
            <th className="w-8 px-4 py-2" />
            <th className="px-3 py-2 text-left font-medium">{t.run}</th>
            <th className="px-3 py-2 text-left font-medium">{t.trigger}</th>
            <th className="px-3 py-2 text-left font-medium">{t.result}</th>
            <th className="px-3 py-2 text-left font-medium max-sm:hidden">{t.change}</th>
            <th className="px-4 py-2 text-right font-medium max-sm:hidden">{t.duration}</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr
              key={run.runId}
              className="cursor-pointer border-b transition-[background-color] duration-150 last:border-0 hover:bg-muted/60"
              onClick={() => router.push(`/view-execution-result/${run.runId}`)}
            >
              <td className="px-4 py-2.5">
                <span className={cn("status-dot", OUTCOME_DOT[run.outcome])} aria-label={OUTCOME_LABEL[run.outcome][language]} />
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap" title={formatDateTime(run.at, language)}>
                <Link href={`/view-execution-result/${run.runId}`} className="hover:underline">
                  {formatRelative(run.at, language)}
                </Link>
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">{run.trigger ? (t.triggers[run.trigger] ?? run.trigger) : "—"}</td>
              <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                {run.outcome === "error" ? <span className="text-failure">{t.queryError}</span> : t.rows(run.rowCount)}
              </td>
              <td className="px-3 py-2.5 text-[12px] whitespace-nowrap max-sm:hidden">
                {run.diff ? (
                  <span className="space-x-2">
                    {run.diff.added > 0 && <span className="text-failure">+{run.diff.added}</span>}
                    {run.diff.fixed > 0 && <span className="text-success">−{run.diff.fixed}</span>}
                    {run.diff.added === 0 && run.diff.fixed === 0 && <span className="text-subtle-foreground">—</span>}
                  </span>
                ) : (
                  <span className="text-subtle-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums max-sm:hidden">
                {run.durationMs === null ? "—" : `${(run.durationMs / 1000).toFixed(1)} s`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
