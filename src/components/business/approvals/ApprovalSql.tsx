"use client";

import { useId, useState } from "react";
import { ChevronRight } from "lucide-react";
import { HighlightedLine } from "@/components/code/HighlightedLine";
import { cn } from "@/lib/utils/utils";
import { sqlView, type ApprovalCopy, type ApprovalRequest } from "./approvals";
import { diffStats, lineDiff, type DiffLine } from "./sql-diff";

const MARKER: Record<DiffLine["kind"], string> = { same: " ", added: "+", removed: "−" };
const ROW: Record<DiffLine["kind"], string> = { same: "", added: "bg-success-soft", removed: "bg-failure-soft" };

function CodeLine({ text }: { text: string }) {
  return text ? <HighlightedLine text={text} language="sql" /> : " ";
}

/**
 * The SQL a request would put live, collapsed behind a toggle; a pending
 * edit shows as a line diff against the check's live SQL.
 */
export function ApprovalSql({
  approval,
  copy,
  defaultOpen = false,
}: {
  approval: Pick<ApprovalRequest, "operationType" | "sqlContent" | "currentSqlContent">;
  copy: ApprovalCopy;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const view = sqlView(approval);
  if (view.kind === "none") return <p className="text-body-sm text-muted-foreground">{copy.noSql}</p>;

  const diff = view.kind === "diff" ? lineDiff(view.before, view.after) : null;
  const stats = diff ? diffStats(diff) : null;
  const unchanged = stats !== null && stats.added === 0 && stats.removed === 0;
  const label = diff ? (open ? copy.hideChanges : copy.showChanges) : open ? copy.hideSql : copy.showSql;

  return (
    <div className="space-y-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="-ml-1 inline-flex h-7 items-center gap-1 rounded-md px-1 text-body-sm font-medium text-primary outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <ChevronRight className={cn("size-4 transition-transform duration-150", open && "rotate-90")} aria-hidden />
        {label}
        {stats && !unchanged && (
          <span className="font-normal tabular-nums text-muted-foreground">
            {copy.changeCount(stats.added, stats.removed)}
          </span>
        )}
      </button>
      {open && (
        <div id={panelId} className="space-y-2">
          {(unchanged || (view.kind === "sql" && view.removed)) && (
            <p className="text-body-sm text-muted-foreground">{view.kind === "sql" ? copy.removedSql : copy.unchangedSql}</p>
          )}
          <pre
            aria-label={copy.sqlLabel}
            className="max-h-80 overflow-auto rounded-lg bg-code py-3 font-mono text-body-sm leading-6"
          >
            {/* w-max keeps a changed line's tint across the full scroll width */}
            <div className="w-max min-w-full">
              {diff
                ? diff.map((line, i) => (
                    <div key={i} className={cn("flex whitespace-pre pr-4", ROW[line.kind])}>
                      <span className="w-7 shrink-0 select-none text-center text-muted-foreground">
                        {MARKER[line.kind]}
                      </span>
                      <span>
                        <CodeLine text={line.text} />
                      </span>
                    </div>
                  ))
                : view.kind === "sql" &&
                  view.sql.split("\n").map((line, i) => (
                    <div key={i} className="whitespace-pre px-4">
                      <CodeLine text={line} />
                    </div>
                  ))}
            </div>
          </pre>
        </div>
      )}
    </div>
  );
}
