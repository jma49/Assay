import { sql, PostgreSQL, SQLDialect } from "@codemirror/lang-sql";

/** PostgreSQL highlighting and completion for the check editor. */
export function postgresExtensions() {
  const dialect = SQLDialect.define({
    ...PostgreSQL.spec,
    // Keeps DO $$ ... $$ bodies highlighted as SQL, not as a string.
    doubleDollarQuotedStrings: false,
  });
  return [
    sql({
      dialect,
      upperCaseKeywords: false,
      schema: {
        pg_catalog: ["now", "current_timestamp", "current_date", "current_time"],
        functions: ["declare", "begin", "end", "loop", "if", "then", "else", "elsif", "raise", "notice"],
      },
    }),
  ];
}
