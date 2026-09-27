/**
 * Splits a script into statements at top-level semicolons: not inside
 * quotes, dollar-quoted bodies (DO blocks) or comments. Checks are
 * read-only, so a statement never needs BEGIN/END bookkeeping: procedural
 * code only appears inside dollar quotes. Backslash escapes apply only in
 * E'...' strings, as with standard_conforming_strings on.
 */
export function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let start = 0;
  let i = 0;

  const push = (end: number) => {
    const text = sql.slice(start, end).trim();
    if (text && !isOnlyComments(text)) statements.push(text);
    start = end + 1;
  };

  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (ch === "-" && next === "-") {
      const end = sql.indexOf("\n", i);
      i = end === -1 ? sql.length : end + 1;
    } else if (ch === "/" && next === "*") {
      // PostgreSQL block comments nest.
      let depth = 1;
      i += 2;
      while (i < sql.length && depth > 0) {
        if (sql[i] === "/" && sql[i + 1] === "*") {
          depth++;
          i += 2;
        } else if (sql[i] === "*" && sql[i + 1] === "/") {
          depth--;
          i += 2;
        } else {
          i++;
        }
      }
    } else if (ch === "'") {
      const escapes = (sql[i - 1] === "E" || sql[i - 1] === "e") && !/[\w$]/.test(sql[i - 2] ?? "");
      i++;
      while (i < sql.length) {
        if (escapes && sql[i] === "\\") {
          i += 2;
        } else if (sql[i] === "'" && sql[i + 1] === "'") {
          i += 2;
        } else if (sql[i] === "'") {
          i++;
          break;
        } else {
          i++;
        }
      }
    } else if (ch === '"') {
      const end = sql.indexOf('"', i + 1);
      i = end === -1 ? sql.length : end + 1;
    } else if (ch === "$" && !/[\w$]/.test(sql[i - 1] ?? "")) {
      const tag = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i))?.[0];
      if (tag) {
        const end = sql.indexOf(tag, i + tag.length);
        i = end === -1 ? sql.length : end + tag.length;
      } else {
        i++;
      }
    } else if (ch === ";") {
      push(i);
      i++;
    } else {
      i++;
    }
  }
  push(sql.length);
  return statements;
}

function isOnlyComments(text: string): boolean {
  return text.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "").trim() === "";
}
