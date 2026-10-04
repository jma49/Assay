export interface DocsHeading {
  id: string;
  text: string;
  depth: 2 | 3;
}

/** URL-safe anchor that keeps CJK characters, so Chinese headings get readable ids. */
export function headingId(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[`*_~[\]()]/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

/** The ## and ### headings of a Markdown page, outside fenced code blocks. */
export function extractHeadings(markdown: string): DocsHeading[] {
  const headings: DocsHeading[] = [];
  let inFence = false;
  for (const line of markdown.split("\n")) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const match = /^(##|###)\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;
    const [, hashes = "", title = ""] = match;
    const text = title.replace(/[`*_]/g, "");
    headings.push({ id: headingId(text), text, depth: hashes.length as 2 | 3 });
  }
  return headings;
}

/** Plain text for search: Markdown syntax and code fences stripped, whitespace collapsed. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`|~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
