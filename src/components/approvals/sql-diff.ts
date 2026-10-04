export type DiffLine = { kind: "same" | "added" | "removed"; text: string };

/** Above this many line pairs the table would be too big to build; show a full replace instead. */
const MAX_CELLS = 250_000;

function splitLines(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").replace(/\n+$/, "").split("\n");
}

/**
 * Line diff of two SQL texts (longest common subsequence), in reading order:
 * where a line was replaced, the removed line comes before the added one.
 */
export function lineDiff(before: string, after: string): DiffLine[] {
  const a = splitLines(before);
  const b = splitLines(after);
  if (a.length * b.length > MAX_CELLS) {
    return [...a.map((text) => ({ kind: "removed" as const, text })), ...b.map((text) => ({ kind: "added" as const, text }))];
  }

  // lcs[i][j] = length of the common subsequence of a[i..] and b[j..]; 0 past either end.
  const lcs: number[][] = [];
  const common = (i: number, j: number) => lcs[i]?.[j] ?? 0;
  for (let i = a.length - 1; i >= 0; i--) {
    const row = new Array<number>(b.length).fill(0);
    lcs[i] = row;
    for (let j = b.length - 1; j >= 0; j--) {
      row[j] = a[i] === b[j] ? common(i + 1, j + 1) + 1 : Math.max(common(i + 1, j), common(i, j + 1));
    }
  }

  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    const left = a[i];
    const right = b[j];
    if (left !== undefined && left === right) {
      lines.push({ kind: "same", text: left });
      i++;
      j++;
    } else if (left !== undefined && (right === undefined || common(i + 1, j) >= common(i, j + 1))) {
      lines.push({ kind: "removed", text: left });
      i++;
    } else if (right !== undefined) {
      lines.push({ kind: "added", text: right });
      j++;
    }
  }
  return lines;
}

export function diffStats(lines: DiffLine[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const line of lines) {
    if (line.kind === "added") added++;
    else if (line.kind === "removed") removed++;
  }
  return { added, removed };
}
