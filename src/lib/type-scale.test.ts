import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Guards the type scale in DESIGN.md: every text size in src is a `text-<level>` utility
// or, in CSS, a `var(--text-<level>)`. Tests are skipped: they may spell old sizes on purpose.

const SRC = path.join(process.cwd(), "src");

/** Arbitrary sizes (`text-[12.5px]`) and Tailwind's default size scale (`text-sm`, `md:text-2xl`). */
const LEGACY_SIZE = /(?<![\w-])text-(?:\[\d[^\]]*\]|(?:xs|sm|base|lg|xl|[2-9]xl)(?![\w-]))/g;

/** A literal font size in CSS. `em` and `%` sizes stay: they scale with their context. */
const CSS_FONT_SIZE = /font-size:\s*[\d.]+(?:px|rem)/g;

/** Literal CSS sizes that are not a level, with the reason. */
const CSS_ALLOWED = new Map([
  // iOS Safari zooms into a focused field under 16px.
  ["app/globals.css", ["font-size: 16px"]],
]);

function sourceFiles(dir: string, extensions: string[]): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext)))
    .filter((entry) => !/\.test\.tsx?$/.test(entry.name))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

function offenders(files: string[], pattern: RegExp, allowed: (file: string) => string[] = () => []) {
  return files.flatMap((file) => {
    const rel = path.relative(SRC, file);
    return readFileSync(file, "utf8")
      .split("\n")
      .flatMap((line, i) =>
        [...line.matchAll(pattern)]
          .map((match) => match[0])
          .filter((found) => !allowed(rel).includes(found))
          .map((found) => `${rel}:${i + 1} ${found}`),
      );
  });
}

describe("type scale", () => {
  it("uses text-<level> utilities instead of arbitrary or default sizes", () => {
    expect(offenders(sourceFiles(SRC, [".tsx", ".ts"]), LEGACY_SIZE)).toEqual([]);
  });

  it("uses var(--text-<level>) instead of literal font sizes in CSS", () => {
    const allowed = (rel: string) => CSS_ALLOWED.get(rel.split(path.sep).join("/")) ?? [];
    expect(offenders(sourceFiles(SRC, [".css"]), CSS_FONT_SIZE, allowed)).toEqual([]);
  });

  it("catches the sizes it is meant to catch", () => {
    const found = (text: string) => [...text.matchAll(LEGACY_SIZE)].map((m) => m[0]);
    expect(found('"px-2 text-[12.5px] sm:text-sm md:text-2xl text-xs"')).toEqual([
      "text-[12.5px]",
      "text-sm",
      "text-2xl",
      "text-xs",
    ]);
    expect(found('"text-body-sm sm:text-caption text-sm-foo context-sm text-[color:red]"')).toEqual([]);
  });
});
