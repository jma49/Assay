import { notFound } from "next/navigation";
import { DocsArticle } from "@/components/docs/DocsArticle";
import { DocsMarkdown } from "@/components/docs/DocsMarkdown";
import { readDocsMarkdown } from "@/lib/docs/content";
import { extractHeadings } from "@/lib/docs/headings";
import { DOCS_PAGES, findDocsPage } from "@/lib/docs/nav";

export const dynamicParams = false;

export function generateStaticParams() {
  return DOCS_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = findDocsPage(slug);
  return { title: found ? found.page.title.en : "Docs" };
}

export default async function DocsPageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = findDocsPage(slug);
  if (!found) notFound();

  const [en, zh] = await Promise.all([readDocsMarkdown(slug, "en"), readDocsMarkdown(slug, "zh")]);

  return (
    <DocsArticle
      page={found.page}
      content={{ en: <DocsMarkdown markdown={en} />, zh: <DocsMarkdown markdown={zh} /> }}
      headings={{ en: extractHeadings(en), zh: extractHeadings(zh) }}
      previous={found.previous}
      next={found.next}
    />
  );
}
