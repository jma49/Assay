import { AlertTriangle, CheckCircle2, Database, MoreHorizontal, Pencil, PlugZap, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { DataSourceDto } from "@/contracts/data-sources";
import { formatDateTime, formatRelative } from "@/lib/utils/datetime";
import type { Copy } from "./copy";
import { sourceName, testTone, type Language } from "./data-sources";

function LastTest({ source, t, language }: { source: DataSourceDto; t: Copy; language: Language }) {
  if (source.builtIn) return <span className="text-muted-foreground">{t.fromEnv}</span>;
  const test = source.lastTest;
  if (!test) return <span className="text-muted-foreground">{t.neverTested}</span>;
  const when = formatRelative(test.at, language);
  const tone = testTone(test);
  if (tone === "failure") {
    return (
      <span className="flex min-w-0 items-center gap-1 text-failure" title={test.error}>
        <XCircle className="size-3.5 shrink-0" />
        <span className="truncate">
          {t.failed(when)}
          {test.error ? ` · ${test.error}` : ""}
        </span>
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
      <span className="inline-flex items-center gap-1 text-success" title={formatDateTime(test.at, language)}>
        <CheckCircle2 className="size-3.5 shrink-0" />
        {t.connected(when)}
        {test.serverVersion ? ` · PostgreSQL ${test.serverVersion.split(" ")[0]}` : ""}
      </span>
      {tone === "attention" && (
        <span className="inline-flex items-center gap-1 text-attention">
          <AlertTriangle className="size-3.5 shrink-0" />
          {t.canWrite}
        </span>
      )}
    </span>
  );
}

/** One source: name, id and engine, where it points, its last test, and how many checks use it. */
export function DataSourceRow({
  source,
  canManage,
  testing,
  language,
  t,
  onTest,
  onEdit,
  onDelete,
}: {
  source: DataSourceDto;
  canManage: boolean;
  testing: boolean;
  language: Language;
  t: Copy;
  onTest: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const name = sourceName(source, language);
  return (
    // Icon, details and actions side by side; on a phone the actions move under the details.
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-3.5 max-sm:grid-cols-[auto_minmax(0,1fr)]">
      <span className="grid size-8 place-items-center self-start rounded-lg bg-muted text-muted-foreground">
        <Database className="size-4" />
      </span>
      <div className="grid min-w-0 gap-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="truncate text-body-md font-medium">{name}</span>
          <span className="font-mono text-caption text-muted-foreground">{source.sourceId}</span>
          {source.builtIn && <span className="rounded-md bg-muted px-1.5 py-0.5 text-caption text-muted-foreground">{t.builtIn}</span>}
        </div>
        {/* Engine, connection, check count; on a phone the connection gets a line of its own below. */}
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
          <span>PostgreSQL</span>
          <span aria-hidden className="max-sm:hidden">
            ·
          </span>
          <span className="min-w-0 truncate font-mono max-sm:order-last max-sm:basis-full">{source.display ?? t.hidden}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0">{t.checks(source.checkCount)}</span>
        </div>
        <div className="min-w-0 text-caption">
          <LastTest source={source} t={t} language={language} />
        </div>
      </div>
      {canManage && (
        <div className="flex items-center gap-2 max-sm:col-start-2">
          <Button size="sm" variant="outline" disabled={testing} onClick={onTest}>
            <PlugZap />
            {testing ? t.testing : t.test}
          </Button>
          {/* The built-in source has no menu; the spacer keeps every row's Test button in one column. */}
          {source.builtIn ? (
            <span className="size-8 shrink-0 max-sm:hidden" aria-hidden />
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" aria-label={`${name}: ${t.more}`}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={onEdit}>
                  <Pencil />
                  {t.edit}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                  <Trash2 />
                  {t.remove}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </li>
  );
}
