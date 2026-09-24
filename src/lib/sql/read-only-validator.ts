/**
 * Static read-only check for PostgreSQL scripts, shared by the UI, API and executor.
 * Best-effort only: it cannot see writes inside user-defined functions.
 * The actual guarantee is the read-only transaction the executor runs in.
 */

export interface SqlValidationResult {
  isValid: boolean;
  reason?: string;
}

const ALLOWED_LEADING_KEYWORDS = ["SELECT", "WITH", "EXPLAIN", "DO"];

const FORBIDDEN_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "MERGE",
  "UPSERT",
  "TRUNCATE",
  "CREATE",
  "DROP",
  "ALTER",
  "RENAME",
  "GRANT",
  "REVOKE",
  "COPY",
  "VACUUM",
  "REINDEX",
  "CLUSTER",
  "REFRESH",
  "LOCK",
  "LISTEN",
  "UNLISTEN",
  "NOTIFY",
  "CALL",
  "EXECUTE",
  "PREPARE",
  "DEALLOCATE",
  "DISCARD",
  "LOAD",
  "IMPORT",
  "COMMIT",
  "ROLLBACK",
  "SAVEPOINT",
  "RESET",
];

const FORBIDDEN_PHRASES: { pattern: RegExp; label: string }[] = [
  { pattern: /\bSET\s+(ROLE|SESSION|LOCAL)\b/, label: "SET ROLE/SESSION/LOCAL" },
  { pattern: /(^|;)\s*SET\b/, label: "SET" },
  { pattern: /\bFOR\s+(KEY\s+)?SHARE\b/, label: "FOR SHARE" },
  { pattern: /\bCOMMENT\s+ON\b/, label: "COMMENT ON" },
  { pattern: /\bSECURITY\s+LABEL\b/, label: "SECURITY LABEL" },
];

const FORBIDDEN_FUNCTIONS = [
  "PG_TERMINATE_BACKEND",
  "PG_CANCEL_BACKEND",
  "PG_RELOAD_CONF",
  "PG_ROTATE_LOGFILE",
  "PG_SLEEP",
  "PG_SLEEP_FOR",
  "PG_SLEEP_UNTIL",
  "PG_ADVISORY_LOCK",
  "PG_ADVISORY_XACT_LOCK",
  "NEXTVAL",
  "SETVAL",
  "SET_CONFIG",
  "PG_READ_FILE",
  "PG_READ_BINARY_FILE",
  "PG_LS_DIR",
  "PG_STAT_FILE",
  "LO_IMPORT",
  "LO_EXPORT",
  "LO_UNLINK",
  "LO_CREATE",
  "LO_PUT",
  "LO_FROM_BYTEA",
  "DBLINK\\w*",
];

interface StrippedSql {
  code: string;
  /** Dollar-quoted bodies (e.g. DO blocks), inspected as code. */
  dollarBodies: string;
}

const isIdentChar = (ch: string | undefined) =>
  ch !== undefined && /[A-Za-z0-9_$]/.test(ch);

/** Removes comments, string literals and quoted identifiers; returns upper-cased SQL. */
function stripSql(sql: string): StrippedSql {
  let code = "";
  let dollarBodies = "";
  let dollarTag: string | null = null;
  let i = 0;

  const emit = (text: string) => {
    if (dollarTag === null) code += text;
    else dollarBodies += text;
  };

  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (ch === "-" && next === "-") {
      const end = sql.indexOf("\n", i);
      i = end === -1 ? sql.length : end;
      emit(" ");
      continue;
    }

    // PostgreSQL block comments can nest.
    if (ch === "/" && next === "*") {
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
      emit(" ");
      continue;
    }

    // E'...' strings allow backslash escapes.
    if (ch === "'") {
      const escapeString =
        (sql[i - 1] === "E" || sql[i - 1] === "e") && !isIdentChar(sql[i - 2]);
      i++;
      while (i < sql.length) {
        if (escapeString && sql[i] === "\\") {
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
      emit(" '' ");
      continue;
    }

    if (ch === '"') {
      const end = sql.indexOf('"', i + 1);
      i = end === -1 ? sql.length : end + 1;
      emit(' "" ');
      continue;
    }

    if (ch === "$" && !isIdentChar(sql[i - 1])) {
      const match = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      if (match) {
        const tag = match[0];
        if (dollarTag === null) {
          dollarTag = tag;
        } else if (dollarTag === tag) {
          dollarTag = null;
        }
        code += " ";
        dollarBodies += " ";
        i += tag.length;
        continue;
      }
    }

    emit(ch);
    i++;
  }

  const normalize = (s: string) => s.toUpperCase().replace(/\s+/g, " ").trim();
  return { code: normalize(code), dollarBodies: normalize(dollarBodies) };
}

export function validateReadOnlySql(sqlContent: string): SqlValidationResult {
  const { code, dollarBodies } = stripSql(sqlContent ?? "");

  if (code === "") {
    return { isValid: false, reason: "SQL 内容为空。" };
  }

  const everything = `${code} ${dollarBodies}`;

  for (const keyword of FORBIDDEN_KEYWORDS) {
    if (new RegExp(`\\b${keyword}\\b`).test(everything)) {
      return {
        isValid: false,
        reason: `禁止使用关键词 "${keyword}"。系统仅允许查询操作（SELECT）。`,
      };
    }
  }

  for (const { pattern, label } of FORBIDDEN_PHRASES) {
    if (pattern.test(code) || pattern.test(dollarBodies)) {
      return { isValid: false, reason: `禁止使用 "${label}"。` };
    }
  }

  // Outside a DO block, SELECT ... INTO creates a table; inside, it assigns a variable.
  if (/\bINTO\b/.test(code)) {
    return {
      isValid: false,
      reason: `禁止在 DO 块之外使用 "INTO"（SELECT INTO 会创建新表）。`,
    };
  }

  for (const fn of FORBIDDEN_FUNCTIONS) {
    const match = new RegExp(`\\b(${fn})\\s*\\(`).exec(everything);
    if (match) {
      return {
        isValid: false,
        reason: `禁止调用函数 "${match[1].toLowerCase()}"，它会产生副作用。`,
      };
    }
  }

  const leading = code.match(/^[A-Z]+/)?.[0];
  if (!leading || !ALLOWED_LEADING_KEYWORDS.includes(leading)) {
    return {
      isValid: false,
      reason:
        "SQL语句必须以 SELECT、WITH、EXPLAIN 或 DO 开头。系统仅允许查询操作和安全的PL/pgSQL块。",
    };
  }

  return { isValid: true };
}
