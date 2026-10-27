import { highlightSql } from "@/lib/highlight";
import { cn } from "@/lib/utils/utils";

/**
 * A statement printed on film: line numbers, highlighting, and the read-only stamp every query carries.
 * Used wherever a check's SQL is shown next to its result.
 */
export function SqlSlip({
  sql,
  language,
  title,
  className,
}: {
  sql: string;
  language: "en" | "zh";
  title?: string;
  className?: string;
}) {
  const zh = language === "zh";
  const lines = sql.replace(/\s+$/, "").split("\n");
  return (
    <div className={cn("slip", className)}>
      <div className="slip-head">
        <span className="lead">{title ?? (zh ? "查询" : "Query")}</span>
        <span className="lead rounded-sm border border-room-line-2 px-1.5 py-0.5">
          {zh ? "只读" : "Read-only"}
        </span>
      </div>
      <pre aria-label={zh ? "查询语句" : "Query"}>
        {lines.map((line, i) => (
          <span key={i} className="ln">
            {highlightSql(line).map((token, j) => (
              <span key={j} className={token.kind === "plain" ? undefined : `tok-${token.kind}`}>
                {token.text}
              </span>
            ))}
          </span>
        ))}
      </pre>
    </div>
  );
}
