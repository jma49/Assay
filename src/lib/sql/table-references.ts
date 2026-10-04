/**
 * Best-effort list of the tables a SELECT reads, for the coverage map.
 * It is not a parser: it follows FROM/JOIN in query context, skips CTE
 * names, subqueries and function calls, and folds unquoted names to lower
 * case like PostgreSQL does. It is never used for access control.
 */

type Token = { kind: "ident"; text: string; quoted: boolean } | { kind: "punct"; text: string };

const RESERVED_AFTER_TABLE = new Set([
  "ON", "USING", "WHERE", "GROUP", "ORDER", "HAVING", "LIMIT", "OFFSET", "UNION", "INTERSECT", "EXCEPT",
  "JOIN", "INNER", "LEFT", "RIGHT", "FULL", "CROSS", "NATURAL", "WINDOW", "FETCH", "FOR", "TABLESAMPLE",
  "LATERAL", "RETURNING",
]);

function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < sql.length) {
    const ch = sql.charAt(i);
    const next = sql[i + 1];
    if (/\s/.test(ch)) {
      i++;
    } else if (ch === "-" && next === "-") {
      const end = sql.indexOf("\n", i);
      i = end === -1 ? sql.length : end;
    } else if (ch === "/" && next === "*") {
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? sql.length : end + 2;
    } else if (ch === "'") {
      i++;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") i += 2;
        else if (sql[i++] === "'") break;
      }
      tokens.push({ kind: "punct", text: "'" });
    } else if (ch === "$" && /^\$([A-Za-z_]\w*)?\$/.test(sql.slice(i))) {
      const tag = /^\$([A-Za-z_]\w*)?\$/.exec(sql.slice(i))![0];
      const end = sql.indexOf(tag, i + tag.length);
      i = end === -1 ? sql.length : end + tag.length;
      tokens.push({ kind: "punct", text: "'" });
    } else if (ch === '"') {
      const end = sql.indexOf('"', i + 1);
      const stop = end === -1 ? sql.length : end;
      tokens.push({ kind: "ident", text: sql.slice(i + 1, stop), quoted: true });
      i = stop + 1;
    } else if (/[A-Za-z_]/.test(ch)) {
      const match = /^[A-Za-z_][\w$]*/.exec(sql.slice(i))!;
      tokens.push({ kind: "ident", text: match[0], quoted: false });
      i += match[0].length;
    } else {
      tokens.push({ kind: "punct", text: ch });
      i++;
    }
  }
  return tokens;
}

const isWord = (token: Token | undefined, ...words: string[]) =>
  token?.kind === "ident" && !token.quoted && words.includes(token.text.toUpperCase());

const nameOf = (token: Token & { kind: "ident" }) => (token.quoted ? token.text : token.text.toLowerCase());

export function tableReferences(sql: string): string[] {
  const tokens = tokenize(sql);
  const cteNames = new Set<string>();
  const found = new Set<string>();

  // `name [(cols)] AS [NOT] [MATERIALIZED] (` defines a CTE.
  tokens.forEach((token, index) => {
    if (token.kind !== "ident") return;
    let j = index + 1;
    if (tokens[j]?.text === "(") {
      while (j < tokens.length && tokens[j]?.text !== ")") j++;
      j++;
    }
    if (!isWord(tokens[j], "AS")) return;
    j++;
    if (isWord(tokens[j], "NOT")) j++;
    if (isWord(tokens[j], "MATERIALIZED")) j++;
    if (tokens[j]?.text === "(" && isWord(tokens[j + 1], "SELECT", "WITH", "VALUES")) cteNames.add(nameOf(token));
  });

  // Whether each open parenthesis holds a query; FROM inside EXTRACT(... FROM x) is not a table.
  const queryContext: boolean[] = [true];

  /** Reads `a.b.c` at index; returns the qualified name and the index after it. */
  const readName = (index: number): [string | null, number] => {
    const parts: string[] = [];
    let j = index;
    while (tokens[j]?.kind === "ident") {
      parts.push(nameOf(tokens[j] as Token & { kind: "ident" }));
      if (tokens[j + 1]?.text !== ".") break;
      j += 2;
    }
    if (parts.length === 0) return [null, index];
    // A name followed by "(" is a set-returning function, not a table.
    if (tokens[j + 1]?.text === "(") return [null, j + 1];
    return [parts.slice(-2).join("."), j + 1];
  };

  const readTableList = (start: number, allowComma: boolean) => {
    let j = start;
    for (;;) {
      while (isWord(tokens[j], "ONLY", "LATERAL")) j++;
      if (tokens[j]?.text === "(") return;
      const [name, after] = readName(j);
      if (name && !(cteNames.has(name) && !name.includes("."))) found.add(name);
      j = after;
      if (!allowComma) return;
      if (isWord(tokens[j], "AS")) j++;
      const alias = tokens[j];
      if (alias?.kind === "ident" && !RESERVED_AFTER_TABLE.has(alias.text.toUpperCase())) j++;
      if (tokens[j]?.text !== ",") return;
      j++;
    }
  };

  tokens.forEach((token, index) => {
    if (token.text === "(") {
      const previous = tokens[index - 1];
      const opensQuery = isWord(tokens[index + 1], "SELECT", "WITH", "VALUES") || isWord(previous, "FROM", "JOIN");
      queryContext.push(opensQuery);
    } else if (token.text === ")") {
      if (queryContext.length > 1) queryContext.pop();
    } else if (queryContext[queryContext.length - 1]) {
      if (isWord(token, "FROM")) readTableList(index + 1, true);
      else if (isWord(token, "JOIN")) readTableList(index + 1, false);
    }
  });

  return [...found].sort();
}
