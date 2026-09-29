/**
 * What the AI may learn about a run's rows: per-column shape, never values.
 * Rows can hold customer data, so triage describes them instead of sending them.
 */
export interface ColumnProfile {
  column: string;
  types: string[];
  nulls: number;
  distinct: number;
}

const PROFILE_ROW_LIMIT = 50;

function typeOf(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (value instanceof Date) return "date";
  if (typeof value === "string" && !Number.isNaN(Date.parse(value)) && /^\d{4}-\d{2}-\d{2}/.test(value)) return "date";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

export function profileRows(rows: unknown[]): { sampled: number; columns: ColumnProfile[] } {
  const sample = rows.slice(0, PROFILE_ROW_LIMIT).filter((row): row is Record<string, unknown> => !!row && typeof row === "object");
  const columns = new Map<string, { types: Set<string>; nulls: number; values: Set<string> }>();
  for (const row of sample) {
    for (const [column, value] of Object.entries(row)) {
      const entry = columns.get(column) ?? { types: new Set(), nulls: 0, values: new Set() };
      const type = typeOf(value);
      if (type === "null") entry.nulls++;
      else entry.types.add(type);
      entry.values.add(JSON.stringify(value));
      columns.set(column, entry);
    }
  }
  return {
    sampled: sample.length,
    columns: [...columns.entries()].map(([column, e]) => ({
      column,
      types: [...e.types].sort(),
      nulls: e.nulls,
      distinct: e.values.size,
    })),
  };
}
