import { useMemo } from "react";
import { rejectedSqlTerm, sqlValidationMessage, validateReadOnlySql } from "@/lib/sql/read-only-validator";

/** Under the editor: whether the query passes the read-only check, and the dialect. */
export function EditorStatusBar({ sql, language }: { sql: string; language: "en" | "zh" }) {
  const zh = language === "zh";
  const validation = useMemo(() => (sql.trim() ? validateReadOnlySql(sql) : null), [sql]);
  const refused = useMemo(() => (sql.trim() ? rejectedSqlTerm(sql) : null), [sql]);

  return (
    <div className="flex min-h-9 items-center justify-between gap-4 border-t border-line px-3 py-1.5 text-caption">
      {validation === null ? (
        <span className="text-ink-2">
          {zh ? "写一条查询，查出结果即表示需要关注" : "Write a query; any rows it returns need attention"}
        </span>
      ) : validation.isValid ? (
        <span className="inline-flex items-center gap-2 text-ink">
          <span className="size-1.5 rounded-full bg-ink" aria-hidden />
          {zh ? "只读查询，可以保存" : "Read-only, ready to save"}
        </span>
      ) : (
        <span className="inline-flex min-w-0 items-center gap-2 text-failure">
          <span className="size-1.5 shrink-0 rounded-full bg-failure" aria-hidden />
          {refused && (
            <span className="lead shrink-0 rounded-sm border border-failure/40 bg-failure-soft px-1.5 py-0.5 text-failure">{refused}</span>
          )}
          <span className="truncate">{sqlValidationMessage(validation, language)}</span>
        </span>
      )}
      <span className="shrink-0 text-ink-3">PostgreSQL</span>
    </div>
  );
}
