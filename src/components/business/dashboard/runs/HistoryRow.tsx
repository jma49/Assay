import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { OUTCOME_DOT, OUTCOME_TEXT, outcomeOf } from "@/components/checks/status";
import { formatRelative } from "@/lib/utils/datetime";
import { cn } from "@/lib/utils/utils";
import type { Check, DashboardTranslationKeys } from "../types";
import { formatDate } from "../utils";

type Translate = (key: DashboardTranslationKeys) => string;

function StatusLabel({ check, t }: { check: Check; t: Translate }) {
  const outcome = outcomeOf(check);
  const label = {
    issues: t("needsAttention") || "Attention",
    clean: t("filterSuccess"),
    error: t("filterFailed"),
  }[outcome];
  return (
    <span className={cn("inline-flex items-center gap-2 text-[13px]", OUTCOME_TEXT[outcome])}>
      <span className={cn("status-dot", OUTCOME_DOT[outcome])} aria-hidden />
      {label}
    </span>
  );
}

interface HistoryRowProps {
  check: Check;
  displayName: string;
  language: string;
  t: Translate;
}

/** One run; clicking anywhere outside its links opens the run report. */
export function HistoryRow({ check, displayName, language, t }: HistoryRowProps) {
  const router = useRouter();
  const reportHref = `/view-execution-result/${check._id}`;
  return (
    <TableRow
      className="group/row cursor-pointer"
      onClick={(event) => {
        // Links and buttons inside the row keep their own action.
        if ((event.target as HTMLElement).closest("a, button")) return;
        router.push(reportHref);
      }}
    >
      <TableCell className="px-6 py-3">
        <StatusLabel check={check} t={t} />
      </TableCell>
      <TableCell className="max-w-64 px-4 py-3 font-medium" title={check.script_name}>
        <Link
          href={`/checks/${encodeURIComponent(check.script_name)}`}
          className="block truncate underline-offset-4 hover:underline"
        >
          {displayName}
        </Link>
      </TableCell>
      <TableCell className="hidden max-w-52 px-4 py-3 text-[13px] text-muted-foreground tabular-nums lg:table-cell">
        <time
          className="block truncate"
          dateTime={check.execution_time}
          title={formatDate(check.execution_time, language)}
        >
          {formatRelative(check.execution_time, language)}
        </time>
      </TableCell>
      <TableCell
        className="hidden px-4 py-3 text-sm md:table-cell"
        title={check.findings || check.message || t("noData")}
      >
        <div className="max-w-md truncate">
          {check.findings || check.message || <span className="text-muted-foreground">{t("noData")}</span>}
        </div>
      </TableCell>
      <TableCell className="px-6 py-3 text-right">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-mr-2 h-8 gap-1.5 px-2 text-[13px] text-muted-foreground hover:text-foreground"
          title={t("viewFullReportButton") || "View report"}
        >
          <Link href={reportHref}>
            <span className="hidden sm:inline">{t("viewFullReportButton") || "View Report"}</span>
            <ChevronRight className="size-3.5" />
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}
