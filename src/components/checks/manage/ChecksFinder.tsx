"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Activity, Edit, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CheckDefinition } from "@/components/business/dashboard/types";
import { cn } from "@/lib/utils/utils";
import { scheduleLabel } from "@/components/checks/status";
import { listKeyHandler } from "./list-keys";

type Source =
  | { kind: "all" }
  | { kind: "scheduled" }
  | { kind: "tag"; value: string }
  | { kind: "scope"; value: string };

const COPY = {
  en: {
    library: "Library",
    all: "All Checks",
    scheduled: "Scheduled",
    tags: "Tags",
    scopes: "Scopes",
    empty: "No checks here",
    choose: "Select a check to see it here",
    edit: "Edit",
    editHistory: "Edit history",
    runHistory: "Run history",
    delete: "Delete",
    author: "Author",
    scope: "Scope",
    tags_: "Tags",
    schedule: "Schedule",
    manual: "Manual only",
    created: "Created",
    sql: "SQL",
  },
  zh: {
    library: "资料库",
    all: "全部检查",
    scheduled: "定时执行",
    tags: "标签",
    scopes: "范围",
    empty: "这里没有检查",
    choose: "选择一个检查查看详情",
    edit: "编辑",
    editHistory: "编辑历史",
    runHistory: "执行历史",
    delete: "删除",
    author: "作者",
    scope: "范围",
    tags_: "标签",
    schedule: "定时",
    manual: "仅手动执行",
    created: "创建时间",
    sql: "SQL",
  },
};

function countBy(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function sameSource(a: Source, b: Source) {
  return a.kind === b.kind && ("value" in a ? a.value : "") === ("value" in b ? b.value : "");
}

/**
 * Scripts as a Finder window: a source list (library, tags, scopes), the
 * checks in the chosen group, and a preview of the selected check with its
 * SQL and actions.
 */
export function ChecksFinder({
  scripts,
  searchTerm,
  language,
  onEdit,
  onEditHistory,
  onRunHistory,
  onDelete,
  initialSelectedId = null,
}: {
  scripts: CheckDefinition[];
  searchTerm: string;
  language: string;
  onEdit: (script: CheckDefinition) => void;
  onEditHistory: (scriptId: string) => void;
  onRunHistory: (scriptId: string) => void;
  onDelete: (script: CheckDefinition) => void;
  /** A check to select when the list first loads, e.g. from a link. */
  initialSelectedId?: string | null;
}) {
  const zh = language === "zh";
  const t = zh ? COPY.zh : COPY.en;
  const [source, setSource] = useState<Source>({ kind: "all" });
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);

  const tags = useMemo(() => countBy(scripts.flatMap((s) => s.hashtags ?? [])), [scripts]);
  const scopes = useMemo(() => countBy(scripts.map((s) => s.scope).filter((s): s is string => !!s)), [scripts]);

  const visible = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return scripts.filter((script) => {
      const inSource =
        source.kind === "all" ||
        (source.kind === "scheduled" && script.isScheduled) ||
        (source.kind === "tag" && script.hashtags?.includes(source.value)) ||
        (source.kind === "scope" && script.scope === source.value);
      const matches =
        !q ||
        [script.scriptId, script.name, script.cnName, script.author, script.description]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(q));
      return inSource && matches;
    });
  }, [scripts, source, searchTerm]);

  // Keep a check selected: the first one whenever the selection leaves the list (adjusted while rendering).
  // An empty list (still loading, or filtered out) keeps the choice, e.g. one from a link.
  if (visible.length > 0 && !visible.some((script) => script.scriptId === selectedId)) {
    setSelectedId(visible[0].scriptId);
  }

  const selected = visible.find((script) => script.scriptId === selectedId) ?? null;
  const name = (script: CheckDefinition) => (zh ? script.cnName || script.name : script.name);

  const sourceItem = (item: Source, label: string, count: ReactNode) => {
    const active = sameSource(source, item);
    return (
      <li key={label}>
        <button
          type="button"
          onClick={() => setSource(item)}
          aria-pressed={active}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-[4px] px-3 py-1 text-left text-body-sm whitespace-nowrap",
            active ? "bg-primary-soft font-medium text-primary-ink" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <span className="truncate">{label}</span>
          <span className={cn("tabular-nums", "text-muted-foreground")}>{count}</span>
        </button>
      </li>
    );
  };

  const sectionTitle = (label: string) => (
    <p className="px-3 pt-3 pb-1 text-label-caps uppercase text-muted-foreground max-xl:hidden">{label}</p>
  );

  return (
    <div className="flex h-[calc(100dvh-10rem)] min-h-[440px] overflow-hidden rounded-xl bg-card shadow-border max-xl:h-auto max-xl:flex-col">
      {/* Source list */}
      <nav
        aria-label={t.library}
        className="w-52 shrink-0 overflow-y-auto border-r bg-sidebar p-2 max-xl:flex max-xl:w-full max-xl:overflow-x-auto max-xl:border-r-0 max-xl:border-b [&>ul]:max-xl:flex [&>ul]:max-xl:shrink-0"
      >
        {sectionTitle(t.library)}
        <ul>
          {sourceItem({ kind: "all" }, t.all, scripts.length)}
          {sourceItem({ kind: "scheduled" }, t.scheduled, scripts.filter((s) => s.isScheduled).length)}
        </ul>
        {tags.length > 0 && sectionTitle(t.tags)}
        <ul>{tags.map(([tag, count]) => sourceItem({ kind: "tag", value: tag }, `#${tag}`, count))}</ul>
        {scopes.length > 0 && sectionTitle(t.scopes)}
        <ul>{scopes.map(([scope, count]) => sourceItem({ kind: "scope", value: scope }, scope, count))}</ul>
      </nav>

      {/* Checks in the chosen group */}
      <ul
        role="listbox"
        aria-label={t.all}
        onKeyDown={listKeyHandler(
          visible.map((script) => script.scriptId),
          selectedId,
          setSelectedId,
          (id) => {
            const script = visible.find((s) => s.scriptId === id);
            if (script) onEdit(script);
          },
        )}
        className="w-80 shrink-0 overflow-y-auto border-r max-xl:max-h-72 max-xl:w-full max-xl:border-r-0 max-xl:border-b">
        {visible.length === 0 ? (
          <li className="p-6 text-center text-body-sm text-muted-foreground">{t.empty}</li>
        ) : (
          visible.map((script, index) => {
            const active = script.scriptId === selectedId;
            return (
              <li key={script.scriptId} role="option" aria-selected={active}>
                <button
                  type="button"
                  data-list-id={script.scriptId}
                  tabIndex={active || (!selectedId && index === 0) ? 0 : -1}
                  onClick={() => setSelectedId(script.scriptId)}
                  onDoubleClick={() => onEdit(script)}
                  className={cn(
                    "block w-full px-4 py-2 text-left",
                    active ? "bg-primary-soft" : "hover:bg-muted",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="truncate text-body-sm font-medium">{name(script)}</span>
                    {script.isScheduled && (
                      <span className={cn("shrink-0 text-caption", "text-muted-foreground")}>⏱</span>
                    )}
                  </span>
                  <span className={cn("block truncate font-mono text-caption", "text-muted-foreground")}>
                    {script.scriptId}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>

      {/* Preview */}
      <section className="min-w-0 flex-1 overflow-y-auto bg-card">
        {!selected ? (
          <p className="p-8 text-center text-body-sm text-muted-foreground">{t.choose}</p>
        ) : (
          <div className="space-y-5 p-6">
            <header className="space-y-1">
              <h2 className="font-display text-headline leading-tight font-semibold">{name(selected)}</h2>
              <p className="font-mono text-caption text-muted-foreground">{selected.scriptId}</p>
              {(zh ? selected.cnDescription || selected.description : selected.description) && (
                <p className="pt-1 text-body-sm leading-relaxed">
                  {zh ? selected.cnDescription || selected.description : selected.description}
                </p>
              )}
            </header>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => onEdit(selected)}>
                <Edit />
                {t.edit}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onRunHistory(selected.scriptId)}>
                <Activity />
                {t.runHistory}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onEditHistory(selected.scriptId)}>
                <History />
                {t.editHistory}
              </Button>
              <Button size="sm" variant="destructive" className="ml-auto" onClick={() => onDelete(selected)}>
                <Trash2 />
                {t.delete}
              </Button>
            </div>

            <div>
              <p className="pb-1.5 text-label-caps uppercase text-muted-foreground">{t.sql}</p>
              <pre className="max-h-80 overflow-auto rounded-lg border bg-code p-4 font-mono text-body-sm leading-relaxed">
                {selected.sqlContent}
              </pre>
            </div>

            <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-body-sm">
              <dt className="text-muted-foreground">{t.author}</dt>
              <dd>{selected.author || "–"}</dd>
              <dt className="text-muted-foreground">{t.scope}</dt>
              <dd>{(zh ? selected.cnScope || selected.scope : selected.scope) || "–"}</dd>
              <dt className="text-muted-foreground">{t.tags_}</dt>
              <dd>{selected.hashtags?.length ? selected.hashtags.map((tag) => `#${tag}`).join("  ") : "–"}</dd>
              <dt className="text-muted-foreground">{t.schedule}</dt>
              <dd className="font-mono text-caption">{selected.isScheduled && selected.cronSchedule ? scheduleLabel(selected.cronSchedule, zh ? "zh" : "en") : t.manual}</dd>
              <dt className="text-muted-foreground">{t.created}</dt>
              <dd className="tabular-nums">
                {selected.createdAt ? new Date(selected.createdAt).toLocaleString(zh ? "zh-CN" : "en-US") : "–"}
              </dd>
            </dl>
          </div>
        )}
      </section>
    </div>
  );
}
