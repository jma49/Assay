import { highlightShell, highlightSql } from "@/lib/highlight";

/** One line of a code sample, coloured by token. */
export function HighlightedLine({ text, language }: { text: string; language: "sql" | "shell" }) {
  const tokens = language === "sql" ? highlightSql(text) : highlightShell(text);
  return (
    <>
      {tokens.map((token, i) =>
        token.kind === "plain" ? token.text : (
          <span key={i} className={`tok-${token.kind}`}>
            {token.text}
          </span>
        ),
      )}
    </>
  );
}
