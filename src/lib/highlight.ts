/**
 * A small line highlighter for the landing page's code samples (SQL and a
 * shell). Enough for short, known snippets; the app's editor has its own.
 */
export type TokenKind = "keyword" | "string" | "number" | "comment" | "function" | "flag" | "punctuation" | "plain";

export interface Token {
  text: string;
  kind: TokenKind;
}

const SQL_KEYWORDS = new Set(
  "SELECT FROM WHERE AND OR NOT IN EXISTS AS JOIN LEFT RIGHT INNER OUTER ON GROUP BY ORDER HAVING LIMIT OFFSET WITH DISTINCT CASE WHEN THEN ELSE END IS NULL TRUE FALSE BETWEEN LIKE ILIKE UNION ALL INTERVAL ASC DESC DELETE INSERT UPDATE".split(
    " ",
  ),
);

function scan(
  line: string,
  rules: [RegExp, TokenKind | ((match: string) => TokenKind)][],
  merge = true,
): Token[] {
  const tokens: Token[] = [];
  let rest = line;
  while (rest.length > 0) {
    let matched = false;
    for (const [pattern, kind] of rules) {
      const match = pattern.exec(rest);
      if (match && match.index === 0 && match[0].length > 0) {
        const text = match[0];
        const resolved = typeof kind === "function" ? kind(text) : kind;
        const last = tokens[tokens.length - 1];
        // Merge neighbours of the same kind so the output stays small.
        if (merge && last && last.kind === resolved) last.text += text;
        else tokens.push({ text, kind: resolved });
        rest = rest.slice(text.length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      const last = tokens[tokens.length - 1];
      if (last && last.kind === "plain") last.text += rest[0];
      else tokens.push({ text: rest[0], kind: "plain" });
      rest = rest.slice(1);
    }
  }
  return tokens;
}

export function highlightSql(line: string): Token[] {
  return scan(line, [
    [/^--.*/, "comment"],
    [/^'(?:[^']|'')*'?/, "string"],
    [/^\d+(?:\.\d+)?\b/, "number"],
    [/^[A-Za-z_][\w$]*(?=\s*\()/, (word) => (SQL_KEYWORDS.has(word.toUpperCase()) ? "keyword" : "function")],
    [/^[A-Za-z_][\w$]*/, (word) => (SQL_KEYWORDS.has(word.toUpperCase()) ? "keyword" : "plain")],
    [/^[(),;.=<>*+-]/, "punctuation"],
    [/^\s+/, "plain"],
  ]);
}

const SHELL_RULES: [RegExp, TokenKind][] = [
  [/^#.*/, "comment"],
  [/^"[^"]*"?|^'[^']*'?/, "string"],
  [/^--?[\w-]+/, "flag"],
  [/^&&|^\|\|?|^;/, "punctuation"],
  [/^\s+/, "plain"],
  [/^[^\s#"';|&]+/, "plain"],
];

/** A shell line: the command word, flags, strings, comments; `&&` starts a new command. */
export function highlightShell(line: string): Token[] {
  let commandNext = true;
  // Unmerged, so each word is its own token and the command word can be found.
  return scan(line, SHELL_RULES, false).map((token) => {
    if (token.kind === "plain" && token.text.trim() && commandNext) {
      commandNext = false;
      return { ...token, kind: "function" as const };
    }
    if (token.kind === "punctuation") commandNext = true;
    return token;
  });
}
