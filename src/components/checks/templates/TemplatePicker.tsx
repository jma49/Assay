"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutTemplate } from "lucide-react";
import { useApi } from "@/client/use-api";
import { useLanguage } from "@/components/common/LanguageProvider";
import { Button } from "@/components/ui/button";
import type { SchemaTable } from "@/lib/database/db-schema";
import { TEMPLATES, type TableRef, type TemplateCheck } from "@/lib/checks/templates";
import { cn } from "@/lib/utils/utils";
import { FIELDS_COPY, TemplateFields } from "./TemplateFields";
import { matchTable, tableKey, useTemplateBuilder } from "./useTemplateBuilder";

const COPY = {
  en: {
    title: "Start from a template",
    hint: "Pick a common check and a table; the query and names are filled in, and you can still edit them.",
    templates: "Templates",
    loading: "Reading the database's tables…",
    failed: "Could not read the database's tables.",
    empty: "The connected role cannot see any tables.",
    preview: "Creates",
    apply: "Use template",
    pick: "Fill in the fields above to see the check.",
  },
  zh: {
    title: "从模板开始",
    hint: "选一个常用检查和一张表，查询和名称会自动填好，之后仍可修改。",
    templates: "模板",
    loading: "正在读取数据库的表…",
    failed: "无法读取数据库的表。",
    empty: "当前连接的角色看不到任何表。",
    preview: "将创建",
    apply: "使用模板",
    pick: "填写上面的字段后即可看到检查。",
  },
};

/**
 * "Start from a template" above the new-check editor. It reads the schema
 * only once opened, and hands the built check to `onApply`; the page decides
 * what to fill in.
 */
export function TemplatePicker({ initialTable, onApply }: { initialTable?: string | null; onApply: (check: TemplateCheck, table: TableRef) => void }) {
  const { language } = useLanguage();
  const t = COPY[language];
  // Opened from the coverage view for a table: the templates are what that link is for.
  const [open, setOpen] = useState(Boolean(initialTable));
  useEffect(() => {
    if (initialTable) setOpen(true);
  }, [initialTable]);
  const { data, error, loading } = useApi<{ tables: SchemaTable[] }>(open ? "/api/schema" : null);
  const tables = data?.tables ?? [];

  return (
    <section className="rounded-xl bg-card shadow-border">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
          <LayoutTemplate className="size-4" />
        </span>
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="text-[14px] font-semibold">{t.title}</span>
          <span className="text-[12px] text-muted-foreground">{t.hint}</span>
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t px-4 pt-4 pb-4">
          {loading && !data ? (
            <p className="text-[13px] text-muted-foreground">{t.loading}</p>
          ) : error ? (
            <p className="text-[13px] text-failure">{error || t.failed}</p>
          ) : tables.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">{t.empty}</p>
          ) : (
            <PickerBody
              tables={tables}
              initialTable={initialTable}
              onApply={(check, table) => {
                onApply(check, table);
                // Done with templates: fold the picker so the filled-in editor comes up.
                setOpen(false);
              }}
            />
          )}
        </div>
      )}
    </section>
  );
}

function PickerBody({ tables, initialTable, onApply }: { tables: SchemaTable[]; initialTable?: string | null; onApply: (check: TemplateCheck, table: TableRef) => void }) {
  const { language } = useLanguage();
  const t = COPY[language];
  const builder = useTemplateBuilder(tables);
  const { form, chooseTemplate, chooseTable, result } = builder;

  // Preselect the table the page was opened for, once the schema is known.
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current) return;
    prefilled.current = true;
    const match = matchTable(tables, initialTable);
    if (match) chooseTable(tableKey(match));
  }, [tables, initialTable, chooseTable]);

  const check = result?.ok ? result.check : null;
  const problem = result && !result.ok ? result.error[language] : null;

  return (
    <div className="grid gap-4">
      <div role="radiogroup" aria-label={t.templates} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {TEMPLATES.map((template) => {
          const selected = template.id === form.templateId;
          return (
            <button
              key={template.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => chooseTemplate(template.id)}
              className={cn(
                "grid gap-0.5 rounded-md px-3 py-2 text-left transition-[background-color,box-shadow] duration-150",
                selected ? "bg-primary-soft shadow-[0_0_0_1.5px_var(--primary)]" : "bg-muted/60 hover:bg-muted",
              )}
            >
              <span className={cn("text-[13px] font-medium", selected && "text-primary")}>{template.title[language]}</span>
              <span className="line-clamp-2 text-[12px] leading-4 text-muted-foreground">{template.summary[language]}</span>
            </button>
          );
        })}
      </div>

      <TemplateFields builder={builder} tables={tables} t={FIELDS_COPY[language]} />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
        <p className={cn("min-w-0 flex-1 text-[12px]", problem ? "text-failure" : "text-muted-foreground")}>
          {problem ?? (check ? (
            <>
              {t.preview} <span className="font-medium text-foreground">{language === "zh" ? check.cnName : check.name}</span>
            </>
          ) : t.pick)}
        </p>
        <Button size="sm" disabled={!check} onClick={() => check && onApply(check, builder.table!)}>
          {t.apply}
        </Button>
      </div>
    </div>
  );
}
