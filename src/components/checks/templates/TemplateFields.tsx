"use client";

import type { ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { SchemaColumn, SchemaTable } from "@/contracts/schema";
import { columnFits, MAX_DUPLICATE_KEY_COLUMNS } from "@/lib/checks/templates";
import { tableKey, type TemplateForm, type useTemplateBuilder } from "./useTemplateBuilder";

export const FIELDS_COPY = {
  en: {
    table: "Table",
    column: "Column",
    keyColumns: "Key columns",
    addColumn: "Add column",
    removeColumn: "Remove column",
    parentTable: "Refers to table",
    parentColumn: "Refers to column",
    hours: "Older than (hours)",
    min: "Minimum",
    max: "Maximum",
    noBound: "none",
    values: "Allowed values, one per line",
    nullAllowed: "Empty (NULL) is fine",
    choose: "Choose…",
    noColumns: "No column suits this template",
  },
  zh: {
    table: "表",
    column: "列",
    keyColumns: "键列",
    addColumn: "添加列",
    removeColumn: "移除列",
    parentTable: "引用的表",
    parentColumn: "引用的列",
    hours: "超过（小时）",
    min: "最小值",
    max: "最大值",
    noBound: "不限",
    values: "允许的取值，每行一个",
    nullAllowed: "允许为空（NULL）",
    choose: "请选择…",
    noColumns: "没有适用于这个模板的列",
  },
};

type Copy = (typeof FIELDS_COPY)["en"];
type Builder = ReturnType<typeof useTemplateBuilder>;

function Field({ id, label, children, className }: { id: string; label: string; children: ReactNode; className?: string }) {
  return (
    // content-start: a taller neighbour (the values box) must not push this label down.
    <div className={`grid min-w-0 content-start gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={id} className="text-[12.5px] font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

const describeTable = (t: SchemaTable) => (t.schema === "public" ? t.name : `${t.schema}.${t.name}`);

// Selects stay controlled from the first render: Radix shows the placeholder
// for "", while undefined would make them uncontrolled until a value is chosen.
function TableSelect({ id, value, tables, onChange, t }: { id: string; value: string; tables: SchemaTable[]; onChange: (key: string) => void; t: Copy }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={t.choose} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {tables.map((table) => (
          <SelectItem key={tableKey(table)} value={tableKey(table)}>
            {describeTable(table)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ColumnSelect({ id, value, columns, onChange, t, disabled }: { id: string; value: string; columns: SchemaColumn[]; onChange: (name: string) => void; t: Copy; disabled?: boolean }) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || columns.length === 0}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={columns.length === 0 && !disabled ? t.noColumns : t.choose} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {columns.map((column) => (
          <SelectItem key={column.name} value={column.name}>
            {column.name} <span className="text-subtle-foreground">{column.type}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** The inputs the chosen template needs, laid out in one responsive grid. */
export function TemplateFields({ builder, tables, t }: { builder: Builder; tables: SchemaTable[]; t: Copy }) {
  const { form, update, chooseTable, template, table, columnOptions, parent } = builder;
  const set = <K extends keyof TemplateForm>(key: K) => (value: TemplateForm[K]) => update({ [key]: value } as Partial<TemplateForm>);
  const fields = template.fields;
  const setColumn = (index: number, name: string) => update({ columns: Object.assign([...form.columns], { [index]: name }) });

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field id="tpl-table" label={t.table}>
        <TableSelect id="tpl-table" value={form.table} tables={tables} onChange={chooseTable} t={t} />
      </Field>

      {fields.includes("column") && (
        <Field id="tpl-column" label={t.column}>
          <ColumnSelect id="tpl-column" value={form.columns[0] ?? ""} columns={columnOptions} onChange={(name) => update({ columns: [name] })} t={t} disabled={!table} />
        </Field>
      )}

      {fields.includes("columns") && (
        <Field id="tpl-column-0" label={t.keyColumns} className="sm:col-span-2 lg:col-span-3">
          <div className="flex flex-wrap items-center gap-2">
            {[...form.columns, ...(form.columns.length === 0 ? [""] : [])].map((name, index) => (
              <div key={index} className="flex min-w-40 flex-1 items-center gap-1 sm:max-w-56">
                <ColumnSelect
                  id={`tpl-column-${index}`}
                  value={name}
                  columns={columnOptions.filter((c) => c.name === name || !form.columns.includes(c.name))}
                  onChange={(value) => setColumn(index, value)}
                  t={t}
                  disabled={!table}
                />
                {form.columns.length > 1 && (
                  <button
                    type="button"
                    aria-label={t.removeColumn}
                    onClick={() => update({ columns: form.columns.filter((_, i) => i !== index) })}
                    className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
            {form.columns.length > 0 && form.columns.length < Math.min(MAX_DUPLICATE_KEY_COLUMNS, columnOptions.length) && (
              <button
                type="button"
                onClick={() => update({ columns: [...form.columns, ""] })}
                className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12.5px] font-medium text-primary hover:bg-primary-soft"
              >
                <Plus className="size-3.5" />
                {t.addColumn}
              </button>
            )}
          </div>
        </Field>
      )}

      {fields.includes("parent") && (
        <>
          <Field id="tpl-parent-table" label={t.parentTable}>
            <TableSelect id="tpl-parent-table" value={form.parentTable} tables={tables} onChange={(key) => update({ parentTable: key, parentColumn: "" })} t={t} />
          </Field>
          <Field id="tpl-parent-column" label={t.parentColumn}>
            <ColumnSelect
              id="tpl-parent-column"
              value={form.parentColumn}
              columns={parent ? parent.columns.filter((c) => columnFits("groupable", c)) : []}
              onChange={set("parentColumn")}
              t={t}
              disabled={!parent}
            />
          </Field>
        </>
      )}

      {fields.includes("maxAgeHours") && (
        <Field id="tpl-hours" label={t.hours}>
          <Input id="tpl-hours" type="number" inputMode="numeric" min={1} step={1} value={form.hours} onChange={(e) => update({ hours: e.target.value })} className="h-8" />
        </Field>
      )}

      {fields.includes("range") && (
        <>
          <Field id="tpl-min" label={t.min}>
            <Input id="tpl-min" type="number" inputMode="decimal" placeholder={t.noBound} value={form.min} onChange={(e) => update({ min: e.target.value })} className="h-8" />
          </Field>
          <Field id="tpl-max" label={t.max}>
            <Input id="tpl-max" type="number" inputMode="decimal" placeholder={t.noBound} value={form.max} onChange={(e) => update({ max: e.target.value })} className="h-8" />
          </Field>
        </>
      )}

      {fields.includes("values") && (
        <Field id="tpl-values" label={t.values} className="sm:col-span-2">
          <Textarea id="tpl-values" rows={3} value={form.values} onChange={(e) => update({ values: e.target.value })} className="min-h-0 font-mono text-[12.5px]" placeholder={"paid\nshipped"} />
          <label className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
            <Switch checked={form.nullAllowed} onCheckedChange={(on) => update({ nullAllowed: on })} />
            {t.nullAllowed}
          </label>
        </Field>
      )}
    </div>
  );
}
