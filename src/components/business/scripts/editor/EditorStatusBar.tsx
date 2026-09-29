import { useMemo } from "react";
import { sqlValidationMessage, validateReadOnlySql } from "@/lib/sql/read-only-validator";

/** Under the editor: whether the query passes the read-only check, and the dialect. */
export function EditorStatusBar({ sql, language }: { sql: string; language: "en" | "zh" }) {
  const zh = language === "zh";
  const validation = useMemo(() => (sql.trim() ? validateReadOnlySql(sql) : null), [sql]);

  return (
    <div className="flex h-9 items-center justify-between gap-4 border-t px-4 text-[12px]">
      {validation === null ? (
        <span className="text-muted-foreground">
          {zh ? "写一条查询，查出结果即表示需要关注" : "Write a query; any rows it returns need attention"}
        </span>
      ) : validation.isValid ? (
        <span className="inline-flex items-center gap-2 text-success">
          <span className="size-1.5 rounded-full bg-success" aria-hidden />
          {zh ? "只读查询，可以保存" : "Read-only, ready to save"}
        </span>
      ) : (
        <span className="inline-flex min-w-0 items-center gap-2 text-failure">
          <span className="size-1.5 shrink-0 rounded-full bg-failure" aria-hidden />
          <span className="truncate">{sqlValidationMessage(validation, language)}</span>
        </span>
      )}
      <span className="shrink-0 text-muted-foreground">PostgreSQL</span>
    </div>
  );
}
