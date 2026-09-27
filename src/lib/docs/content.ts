import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { DOCS_PAGES, type DocsLanguage } from "./nav";
import { extractHeadings, plainText, type DocsHeading } from "./headings";

const CONTENT_DIR = path.join(process.cwd(), "src/content/docs");

/** Slugs come only from DOCS_NAV, never straight from the URL, so no path can escape CONTENT_DIR. */
export async function readDocsMarkdown(slug: string, language: DocsLanguage): Promise<string> {
  if (!DOCS_PAGES.some((page) => page.slug === slug)) throw new Error(`Unknown docs page: ${slug}`);
  return readFile(path.join(CONTENT_DIR, language, `${slug}.md`), "utf8");
}

export interface DocsSearchEntry {
  slug: string;
  language: DocsLanguage;
  title: string;
  headings: DocsHeading[];
  /** The opening of the page, for matching and for the result preview. */
  summary: string;
}

const SUMMARY_LENGTH = 220;

export async function buildDocsSearchIndex(): Promise<DocsSearchEntry[]> {
  const entries = await Promise.all(
    DOCS_PAGES.flatMap((page) =>
      (["en", "zh"] as const).map(async (language) => {
        const markdown = await readDocsMarkdown(page.slug, language);
        return {
          slug: page.slug,
          language,
          title: page.title[language],
          headings: extractHeadings(markdown),
          // Drop the page's own H1 so the summary starts with the lead text.
          summary: plainText(markdown.replace(/^#\s+.+$/m, "")).slice(0, SUMMARY_LENGTH),
        };
      }),
    ),
  );
  return entries;
}
