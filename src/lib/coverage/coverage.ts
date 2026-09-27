import type { SchemaTable } from "@/lib/database/db-schema";
import { tableReferences } from "@/lib/sql/table-references";

export interface CoverageScript {
  scriptId: string;
  name: string;
  cnName?: string;
  sqlContent: string;
}

export interface TableCoverage {
  table: string;
  columnCount: number;
  checks: { scriptId: string; name: string; cnName?: string }[];
}

export interface CoverageReport {
  tables: TableCoverage[];
  covered: number;
  /** Tables a check reads that the database does not have: likely stale checks. */
  unknown: { scriptId: string; table: string }[];
}

/**
 * Resolves a reference the way the default search_path would: a qualified
 * name must match exactly; a bare name prefers `public`, then a table of
 * that name if only one schema has it.
 */
function resolve(reference: string, byQualified: Map<string, TableCoverage>, byName: Map<string, string[]>) {
  if (reference.includes(".")) return byQualified.get(reference);
  const candidates = byName.get(reference) ?? [];
  const qualified = candidates.includes(`public.${reference}`)
    ? `public.${reference}`
    : candidates.length === 1
      ? candidates[0]
      : undefined;
  return qualified ? byQualified.get(qualified) : undefined;
}

/** Which tables have at least one check reading them. Uncovered tables sort first. */
export function computeCoverage(tables: SchemaTable[], scripts: CoverageScript[]): CoverageReport {
  const byQualified = new Map<string, TableCoverage>();
  const byName = new Map<string, string[]>();
  for (const table of tables) {
    const qualified = `${table.schema}.${table.name}`;
    byQualified.set(qualified, { table: qualified, columnCount: table.columns.length, checks: [] });
    byName.set(table.name, [...(byName.get(table.name) ?? []), qualified]);
  }

  const unknown: CoverageReport["unknown"] = [];
  for (const script of scripts) {
    for (const reference of tableReferences(script.sqlContent)) {
      const entry = resolve(reference, byQualified, byName);
      if (!entry) {
        unknown.push({ scriptId: script.scriptId, table: reference });
      } else if (!entry.checks.some((c) => c.scriptId === script.scriptId)) {
        entry.checks.push({ scriptId: script.scriptId, name: script.name, cnName: script.cnName });
      }
    }
  }

  const sorted = [...byQualified.values()].sort(
    (a, b) => Number(a.checks.length > 0) - Number(b.checks.length > 0) || a.table.localeCompare(b.table),
  );
  return { tables: sorted, covered: sorted.filter((t) => t.checks.length > 0).length, unknown };
}
