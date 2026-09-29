import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { OUTCOME_DOT, OUTCOME_LABEL, OUTCOME_TEXT } from "@/components/checks/status";
import { runResultLabel } from "@/lib/utils/run-message";
import { formatDateTime, formatRelative } from "@/lib/utils/datetime";
import { cn } from "@/lib/utils/utils";
import type { DashboardTranslationKeys, HistoryRun } from "../types";

type Translate = (key: DashboardTranslationKeys) => string;

function StatusLabel({ check, language }: { check: HistoryRun; language: "en" | "zh" }) {
  const { outcome } = check;
  return (
    <span className={cn("inline-flex items-center gap-2 text-[13px]", OUTCOME_TEXT[outcome])}>
      <span className={cn("status-dot", OUTCOME_DOT[outcome])} aria-hidden />
      {OUTCOME_LABEL[outcome][language]}
    </span>
  );
}

interface HistoryRowProps {
  check: HistoryRun;
  displayName: string;
  language: string;
  t: Translate;
}

/** One run; clicking anywhere outside its links opens the run report. */
export function HistoryRow({ check, displayName, language, t }: HistoryRowProps) {
  const router = useRouter();
  const reportHref = `/runs/${check._id}`;
  const lang = language === "zh" ? "zh" : "en";
  const result = runResultLabel(check, lang);
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
        <StatusLabel check={check} language={lang} />
      </TableCell>
      <TableCell className="max-w-64 px-4 py-3 font-medium" title={check.checkId}>
        <Link
          href={`/checks/${encodeURIComponent(check.checkId)}`}
          className="block truncate underline-offset-4 hover:underline"
        >
          {displayName}
        </Link>
      </TableCell>
      <TableCell className="hidden max-w-52 px-4 py-3 text-[13px] text-muted-foreground tabular-nums lg:table-cell">
        <time
          className="block truncate"
          dateTime={check.finishedAt}
          title={formatDateTime(check.finishedAt, language)}
        >
          {formatRelative(check.finishedAt, language)}
        </time>
      </TableCell>
      <TableCell className="hidden px-4 py-3 text-[13px] md:table-cell" title={result}>
        <div className={cn("max-w-md truncate tabular-nums", check.outcome !== "issues" && "text-muted-foreground")}>{result}</div>
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
