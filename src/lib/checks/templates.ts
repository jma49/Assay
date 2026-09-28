import type { SchemaColumn, SchemaTable } from "@/lib/database/db-schema";
import { commentText, numericLiteral, quoteIdent, quoteLiteral, quoteTable } from "@/lib/sql/quote";

/**
 * Check templates: common data-quality checks built from a table, its
 * columns and a few parameters. Like every check, each query returns only
 * the rows that need attention, and no rows means it passes. There is no
 * LIMIT: the runner keeps a sample and counts every row, and alerts and
 * new / still / fixed depend on that count.
 *
 * Names come only from the schema the database reported, and every name is
 * quoted; values become literals or validated numbers. Nothing the person
 * types is pasted into SQL as-is.
 */

export type TemplateId = "not-null" | "duplicates" | "orphans" | "freshness" | "out-of-range" | "accepted-values";

/** What a template asks for, besides the table. */
export type TemplateField = "column" | "columns" | "parent" | "maxAgeHours" | "range" | "values";

/** Which columns suit a template. */
export type ColumnKind = "any" | "groupable" | "time" | "number";

type Bilingual = { en: string; zh: string };

export interface TemplateDefinition {
  id: TemplateId;
  title: Bilingual;
  summary: Bilingual;
  fields: TemplateField[];
  columnKind: ColumnKind;
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: "not-null",
    title: { en: "Missing values", zh: "缺失值" },
    summary: { en: "Rows where a column is empty (NULL).", zh: "某一列为空（NULL）的行。" },
    fields: ["column"],
    columnKind: "any",
  },
  {
    id: "duplicates",
    title: { en: "Duplicates", zh: "重复" },
    summary: { en: "Values of one or more columns that appear more than once.", zh: "一列或多列的取值出现不止一次。" },
    fields: ["columns"],
    columnKind: "groupable",
  },
  {
    id: "orphans",
    title: { en: "Orphaned references", zh: "悬空引用" },
    summary: { en: "Rows pointing to a row that does not exist in another table.", zh: "指向另一张表中不存在的记录的行。" },
    fields: ["column", "parent"],
    columnKind: "groupable",
  },
  {
    id: "freshness",
    title: { en: "Freshness", zh: "数据新鲜度" },
    summary: { en: "The newest row is older than a limit, or the table is empty.", zh: "最新一行早于设定时间，或者表是空的。" },
    fields: ["column", "maxAgeHours"],
    columnKind: "time",
  },
  {
    id: "out-of-range",
    title: { en: "Out of range", zh: "超出范围" },
    summary: { en: "Numbers below a minimum or above a maximum.", zh: "小于最小值或大于最大值的数字。" },
    fields: ["column", "range"],
    columnKind: "number",
  },
  {
    id: "accepted-values",
    title: { en: "Unexpected values", zh: "意外取值" },
    summary: { en: "Values outside a list you allow.", zh: "不在允许列表中的取值。" },
    fields: ["column", "values"],
    columnKind: "any",
  },
];

export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id);

const TIME_TYPES = new Set(["timestamp with time zone", "timestamp without time zone", "date"]);
const NUMBER_TYPES = new Set(["smallint", "integer", "bigint", "numeric", "decimal", "real", "double precision"]);
// Types without an equality operator cannot be grouped or joined on.
const UNGROUPABLE_TYPES = new Set(["json", "xml", "point", "line", "lseg", "box", "path", "polygon", "circle"]);

export function columnFits(kind: ColumnKind, column: SchemaColumn): boolean {
  const type = column.type.toLowerCase();
  if (kind === "time") return TIME_TYPES.has(type);
  if (kind === "number") return NUMBER_TYPES.has(type);
  if (kind === "groupable") return !UNGROUPABLE_TYPES.has(type);
  return true;
}

export interface TableRef {
  schema: string;
  name: string;
}

export interface TemplateInput {
  table: TableRef;
  /** One column, or the key columns for duplicates. */
  columns: string[];
  /** Orphans: the table and column the reference should find. */
  parent?: TableRef & { column: string };
  /** Freshness: whole hours. */
  maxAgeHours?: number;
  /** Out of range: either bound may be left out. */
  min?: number | null;
  max?: number | null;
  /** Accepted values, compared as text. */
  values?: string[];
  /** Accepted values: whether an empty (NULL) value is fine. */
  nullAllowed?: boolean;
}

export interface TemplateCheck {
  sql: string;
  scriptId: string;
  name: string;
  cnName: string;
  description: string;
  cnDescription: string;
}

export type TemplateResult = { ok: true; check: TemplateCheck } | { ok: false; error: Bilingual };

export const MAX_DUPLICATE_KEY_COLUMNS = 5;
export const MAX_ACCEPTED_VALUES = 100;
export const MAX_VALUE_LENGTH = 200;
export const MAX_AGE_HOURS = 24 * 366;

const fail = (en: string, zh: string): TemplateResult => ({ ok: false, error: { en, zh } });

/** Accepted values from a text box: one per line, trimmed, blanks and repeats dropped. */
export function parseValueList(text: string): string[] {
  return [...new Set(text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))];
}

const findTable = (tables: SchemaTable[], ref: TableRef | undefined) =>
  ref ? tables.find((t) => t.schema === ref.schema && t.name === ref.name) : undefined;

/** How a table reads in names: `public` is left out, other schemas stay. */
const displayTable = (table: TableRef) => commentText(table.schema === "public" ? table.name : `${table.schema}.${table.name}`);
const displayColumns = (columns: string[]) => commentText(columns.join(", "));

/** A script ID from ASCII parts; the template's own name when nothing ASCII is left. */
export function templateScriptId(parts: string[], suffix: string): string {
  const slug = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const base = parts.map(slug).filter(Boolean).join("-");
  const id = (base ? `${base}-${suffix}` : `${suffix}-check`).slice(0, 64).replace(/-+$/g, "");
  return id;
}

export function buildTemplate(id: TemplateId, input: TemplateInput, tables: SchemaTable[]): TemplateResult {
  const template = templateById(id);
  if (!template) return fail("Unknown template.", "未知的模板。");

  const table = findTable(tables, input.table);
  if (!table) return fail("Choose a table the database has.", "请选择数据库中存在的表。");

  const wanted = template.fields.includes("columns") ? input.columns : input.columns.slice(0, 1);
  if (wanted.length === 0) return fail("Choose a column.", "请选择一列。");
  if (new Set(wanted).size !== wanted.length) return fail("Choose each column once.", "每一列只能选一次。");
  if (wanted.length > MAX_DUPLICATE_KEY_COLUMNS) {
    return fail(`Choose at most ${MAX_DUPLICATE_KEY_COLUMNS} columns.`, `最多选择 ${MAX_DUPLICATE_KEY_COLUMNS} 列。`);
  }
  for (const name of wanted) {
    const column = table.columns.find((c) => c.name === name);
    if (!column) return fail(`${table.name} has no column ${name}.`, `${table.name} 中没有 ${name} 列。`);
    if (!columnFits(template.columnKind, column)) {
      return fail(`${name} (${column.type}) does not suit this template.`, `${name}（${column.type}）不适用于这个模板。`);
    }
  }

  const from = quoteTable(table.schema, table.name);
  const where = displayTable(table);
  switch (id) {
    case "not-null":
      return notNull(from, where, table, wanted[0]);
    case "duplicates":
      return duplicates(from, where, table, wanted);
    case "orphans":
      return orphans(from, where, table, wanted[0], input, tables);
    case "freshness":
      return freshness(from, where, table, wanted[0], input.maxAgeHours);
    case "out-of-range":
      return outOfRange(from, where, table, wanted[0], input.min, input.max);
    case "accepted-values":
      return acceptedValues(from, where, table, wanted[0], input.values ?? [], input.nullAllowed ?? true);
  }
}

function check(sql: string[], parts: Omit<TemplateCheck, "sql">): TemplateResult {
  return { ok: true, check: { ...parts, sql: `-- ${commentText(parts.description)}\n${sql.join("\n")}\n` } };
}

function notNull(from: string, where: string, table: TableRef, column: string): TemplateResult {
  const col = commentText(column);
  return check([`SELECT *`, `FROM ${from}`, `WHERE ${quoteIdent(column)} IS NULL;`], {
    scriptId: templateScriptId([table.name, column], "not-null"),
    name: `Missing ${col} in ${where}`,
    cnName: `${where} 的 ${col} 为空`,
    description: `Rows in ${where} where ${col} is empty (NULL).`,
    cnDescription: `${where} 中 ${col} 为空（NULL）的行。`,
  });
}

function duplicates(from: string, where: string, table: TableRef, columns: string[]): TemplateResult {
  const keys = columns.map(quoteIdent).join(", ");
  const cols = displayColumns(columns);
  return check(
    [
      `SELECT ${keys}, count(*) AS copies`,
      `FROM ${from}`,
      // Like a unique constraint: a key with an empty part is never a duplicate.
      `WHERE ${columns.map((c) => `${quoteIdent(c)} IS NOT NULL`).join(" AND ")}`,
      `GROUP BY ${keys}`,
      `HAVING count(*) > 1`,
      `ORDER BY copies DESC;`,
    ],
    {
      scriptId: templateScriptId([table.name, ...columns], "duplicates"),
      name: `Duplicate ${cols} in ${where}`,
      cnName: `${where} 中 ${cols} 重复`,
      description: `Values of ${cols} that appear in more than one row of ${where}. Rows with an empty value are not counted.`,
      cnDescription: `${where} 中 ${cols} 的取值出现在不止一行。含空值的行不计入。`,
    },
  );
}

function orphans(from: string, where: string, table: TableRef, column: string, input: TemplateInput, tables: SchemaTable[]): TemplateResult {
  const parent = findTable(tables, input.parent);
  if (!parent || !input.parent) return fail("Choose the table the reference points to.", "请选择被引用的表。");
  const parentColumn = parent.columns.find((c) => c.name === input.parent!.column);
  if (!parentColumn) return fail("Choose the column the reference points to.", "请选择被引用的列。");
  if (!columnFits("groupable", parentColumn)) {
    return fail(`${parentColumn.name} (${parentColumn.type}) cannot be matched.`, `${parentColumn.name}（${parentColumn.type}）无法用于匹配。`);
  }
  const col = commentText(column);
  const target = `${displayTable(parent)}.${commentText(parentColumn.name)}`;
  return check(
    [
      `SELECT c.*`,
      `FROM ${from} AS c`,
      `WHERE c.${quoteIdent(column)} IS NOT NULL`,
      `  AND NOT EXISTS (`,
      `    SELECT 1`,
      `    FROM ${quoteTable(parent.schema, parent.name)} AS p`,
      `    WHERE p.${quoteIdent(parentColumn.name)} = c.${quoteIdent(column)}`,
      `  );`,
    ],
    {
      scriptId: templateScriptId([table.name, column], "orphans"),
      name: `${where}.${col} without a matching ${target}`,
      cnName: `${where}.${col} 在 ${target} 中找不到对应记录`,
      description: `Rows in ${where} whose ${col} matches no ${target}.`,
      cnDescription: `${where} 中 ${col} 在 ${target} 里找不到对应记录的行。`,
    },
  );
}

function freshness(from: string, where: string, table: TableRef, column: string, hours: number | undefined): TemplateResult {
  if (typeof hours !== "number" || !Number.isInteger(hours) || hours < 1 || hours > MAX_AGE_HOURS) {
    return fail(`Enter a whole number of hours from 1 to ${MAX_AGE_HOURS}.`, `请输入 1 到 ${MAX_AGE_HOURS} 之间的整数小时。`);
  }
  const col = quoteIdent(column);
  const name = commentText(column);
  return check(
    [
      `SELECT max(${col}) AS latest, date_trunc('minute', now() - max(${col}))::text AS age`,
      `FROM ${from}`,
      // No GROUP BY: one row when the newest value is too old or missing, none otherwise.
      `HAVING max(${col}) IS NULL`,
      `    OR max(${col}) < now() - interval '${hours} hours';`,
    ],
    {
      scriptId: templateScriptId([table.name], "freshness"),
      name: `${where} not updated in ${hours}h`,
      cnName: `${where} 超过 ${hours} 小时没有新数据`,
      description: `The newest ${name} in ${where} is more than ${hours} hours old, or the table is empty.`,
      cnDescription: `${where} 中最新的 ${name} 已超过 ${hours} 小时，或者表是空的。`,
    },
  );
}

function outOfRange(from: string, where: string, table: TableRef, column: string, min?: number | null, max?: number | null): TemplateResult {
  const low = min == null ? null : numericLiteral(min);
  const high = max == null ? null : numericLiteral(max);
  if ((min != null && low === null) || (max != null && high === null)) return fail("Bounds must be numbers.", "上下限必须是数字。");
  if (low === null && high === null) return fail("Set a minimum, a maximum, or both.", "请设置最小值、最大值或两者。");
  if (low !== null && high !== null && (min as number) > (max as number)) {
    return fail("The minimum is above the maximum.", "最小值大于最大值。");
  }
  const col = quoteIdent(column);
  const conditions = [low !== null && `${col} < ${low}`, high !== null && `${col} > ${high}`].filter(Boolean);
  const name = commentText(column);
  const bounds = low !== null && high !== null ? `${low} to ${high}` : low !== null ? `at least ${low}` : `at most ${high}`;
  const cnBounds = low !== null && high !== null ? `${low} 到 ${high} 之间` : low !== null ? `不小于 ${low}` : `不大于 ${high}`;
  return check([`SELECT *`, `FROM ${from}`, `WHERE ${conditions.join(" OR ")};`], {
    scriptId: templateScriptId([table.name, column], "range"),
    name: `${name} out of range in ${where}`,
    cnName: `${where} 的 ${name} 超出范围`,
    description: `Rows in ${where} where ${name} is not ${bounds}.`,
    cnDescription: `${where} 中 ${name} 不在 ${cnBounds} 的行。`,
  });
}

function acceptedValues(from: string, where: string, table: TableRef, column: string, values: string[], nullAllowed: boolean): TemplateResult {
  if (values.length === 0) return fail("List at least one allowed value.", "请至少列出一个允许的取值。");
  if (values.length > MAX_ACCEPTED_VALUES) return fail(`List at most ${MAX_ACCEPTED_VALUES} values.`, `最多列出 ${MAX_ACCEPTED_VALUES} 个取值。`);
  if (values.some((v) => v.length > MAX_VALUE_LENGTH || v.includes("\0"))) {
    return fail(`Each value can have at most ${MAX_VALUE_LENGTH} characters.`, `每个取值最多 ${MAX_VALUE_LENGTH} 个字符。`);
  }
  const col = quoteIdent(column);
  // Compared as text, so enums, numbers and codes all work with the same list.
  const outside = `${col}::text NOT IN (${values.map(quoteLiteral).join(", ")})`;
  const name = commentText(column);
  const shown = commentText(values.slice(0, 5).join(", ") + (values.length > 5 ? ", …" : ""));
  return check([`SELECT *`, `FROM ${from}`, nullAllowed ? `WHERE ${col} IS NOT NULL AND ${outside};` : `WHERE ${col} IS NULL OR ${outside};`], {
    scriptId: templateScriptId([table.name, column], "values"),
    name: `Unexpected ${name} in ${where}`,
    cnName: `${where} 的 ${name} 出现意外取值`,
    description: `Rows in ${where} where ${name} is not one of: ${shown}${nullAllowed ? "" : ", or is empty"}.`,
    cnDescription: `${where} 中 ${name} 不属于 ${shown}${nullAllowed ? "" : "，或为空"} 的行。`,
  });
}
