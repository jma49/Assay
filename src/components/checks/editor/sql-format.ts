/** Line endings and tabs normalized, outer whitespace trimmed. */
const clean = (sql: string) => sql.replace(/\r\n/g, "\n").replace(/\t/g, "  ").trim();

const CLAUSES = [
  "SELECT",
  "FROM",
  "WHERE",
  "JOIN",
  "LEFT JOIN",
  "RIGHT JOIN",
  "INNER JOIN",
  "ORDER BY",
  "GROUP BY",
  "HAVING",
  "WITH",
  "UNION",
  "INSERT",
  "UPDATE",
  "DELETE",
  "CREATE",
  "ALTER",
  "DROP",
  "LIMIT",
];

/**
 * A plain fallback when sql-formatter cannot parse the query: each clause
 * and each AND/OR on its own line, the select list one column per line.
 */
export function basicFormat(sql: string): string {
  let text = clean(sql)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  for (const clause of CLAUSES) text = text.replace(new RegExp(`\\b${clause}\\b`, "gi"), `\n${clause}`);
  text = text.replace(/\b(AND|OR)\b/gi, "\n  $1");
  text = text.replace(/(SELECT[^FROM]*)/gi, (match) => match.replace(/,\s*/g, ",\n  "));
  text = text.replace(/;\s*/g, ";\n\n");
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, lines) => line.length > 0 || (Boolean(lines[index - 1]) && Boolean(lines[index + 1])))
    .join("\n")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

/** Formats PostgreSQL with sql-formatter (loaded on first use), falling back to basicFormat. */
export async function formatSql(sql: string): Promise<string> {
  const cleaned = clean(sql);
  try {
    const { format } = await import("sql-formatter");
    return format(cleaned, {
      language: "postgresql",
      keywordCase: "upper",
      dataTypeCase: "upper",
      functionCase: "upper",
      identifierCase: "preserve",
      indentStyle: "standard",
      tabWidth: 2,
      useTabs: false,
      logicalOperatorNewline: "before",
      expressionWidth: 60,
      linesBetweenQueries: 1,
      denseOperators: false,
      newlineBeforeSemicolon: false,
    });
  } catch (error) {
    console.warn("[editor] sql-formatter failed, using the basic formatter:", error);
    return basicFormat(cleaned);
  }
}
