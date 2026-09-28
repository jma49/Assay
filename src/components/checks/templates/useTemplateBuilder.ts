"use client";

import { useMemo, useState } from "react";
import type { SchemaTable } from "@/lib/database/db-schema";
import {
  buildTemplate,
  columnFits,
  parseValueList,
  templateById,
  type TableRef,
  type TemplateId,
  type TemplateResult,
} from "@/lib/checks/templates";

/** Select values for tables: JSON keeps a schema or name containing "." unambiguous. */
export const tableKey = (table: TableRef) => JSON.stringify([table.schema, table.name]);

export function tableFromKey(key: string): TableRef | undefined {
  try {
    const [schema, name] = JSON.parse(key) as unknown[];
    return typeof schema === "string" && typeof name === "string" ? { schema, name } : undefined;
  } catch {
    return undefined;
  }
}

/** The table `?table=schema.table` (or a bare name) means, if the schema has exactly one. */
export function matchTable(tables: SchemaTable[], wanted: string | null | undefined): SchemaTable | undefined {
  if (!wanted) return undefined;
  const exact = tables.filter((t) => `${t.schema}.${t.name}` === wanted);
  if (exact.length === 1) return exact[0];
  const byName = tables.filter((t) => t.name === wanted);
  return byName.length === 1 ? byName[0] : undefined;
}

/** "" is no bound; anything else must parse as a number (NaN is refused by the builder). */
const numberOrNull = (text: string) => (text.trim() === "" ? null : Number(text));

export interface TemplateForm {
  templateId: TemplateId;
  table: string;
  columns: string[];
  parentTable: string;
  parentColumn: string;
  hours: string;
  min: string;
  max: string;
  values: string;
  nullAllowed: boolean;
}

const EMPTY: TemplateForm = {
  templateId: "not-null",
  table: "",
  columns: [],
  parentTable: "",
  parentColumn: "",
  hours: "24",
  min: "",
  max: "",
  values: "",
  nullAllowed: true,
};

/** The picker's choices and the check they build, rebuilt on every change. */
export function useTemplateBuilder(tables: SchemaTable[]) {
  const [form, setForm] = useState<TemplateForm>(EMPTY);

  const template = templateById(form.templateId)!;
  const tableRef = tableFromKey(form.table);
  const table = tableRef ? tables.find((t) => t.schema === tableRef.schema && t.name === tableRef.name) : undefined;
  const columnOptions = useMemo(() => (table ? table.columns.filter((c) => columnFits(template.columnKind, c)) : []), [table, template.columnKind]);
  const parentRef = tableFromKey(form.parentTable);
  const parent = parentRef ? tables.find((t) => t.schema === parentRef.schema && t.name === parentRef.name) : undefined;

  const result: TemplateResult | null = useMemo(() => {
    // A key column slot that was added but not chosen yet is not a column.
    const columns = form.columns.filter(Boolean);
    // Until every input the template needs has something in it, there is
    // nothing to judge yet: the picker shows a hint rather than an error.
    const fields = template.fields;
    const filled =
      columns.length > 0 &&
      (!fields.includes("parent") || Boolean(parentRef && form.parentColumn)) &&
      (!fields.includes("maxAgeHours") || form.hours.trim() !== "") &&
      (!fields.includes("range") || form.min.trim() !== "" || form.max.trim() !== "") &&
      (!fields.includes("values") || parseValueList(form.values).length > 0);
    if (!tableRef || !filled) return null;
    return buildTemplate(
      form.templateId,
      {
        table: tableRef,
        columns,
        parent: parentRef && form.parentColumn ? { ...parentRef, column: form.parentColumn } : undefined,
        maxAgeHours: Number(form.hours),
        min: numberOrNull(form.min),
        max: numberOrNull(form.max),
        values: parseValueList(form.values),
        nullAllowed: form.nullAllowed,
      },
      tables,
    );
  }, [form, tableRef, parentRef, tables, template.fields]);

  const update = (patch: Partial<TemplateForm>) => setForm((current) => ({ ...current, ...patch }));

  /** A new template keeps the table and the columns that still fit it. */
  const chooseTemplate = (templateId: TemplateId) =>
    setForm((current) => {
      const next = templateById(templateId)!;
      const fits = (name: string) => table?.columns.some((c) => c.name === name && columnFits(next.columnKind, c));
      const kept = current.columns.filter(fits);
      return { ...current, templateId, columns: next.fields.includes("columns") ? kept : kept.slice(0, 1) };
    });

  const chooseTable = (key: string) => update({ table: key, columns: [] });

  return { form, update, chooseTemplate, chooseTable, template, table, columnOptions, parent, result };
}
