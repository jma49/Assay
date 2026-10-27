"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useLanguage } from "@/components/common/LanguageProvider";
import type { DocsHeading } from "@/lib/docs/headings";
import type { DocsLanguage, DocsPage } from "@/lib/docs/nav";
import { cn } from "@/lib/utils/utils";

const COPY = {
  en: { onThisPage: "On this page", previous: "Previous", next: "Next" },
  zh: { onThisPage: "本页内容", previous: "上一篇", next: "下一篇" },
};

/** Highlights the heading the reader is currently in. */
function useActiveHeading(ids: string[]) {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  useEffect(() => {
    const elements = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (elements.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActive(visible.target.id);
      },
      // A heading counts once it reaches the top fifth of the viewport.
      { rootMargin: "-56px 0px -80% 0px" },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

export function DocsArticle({
  page,
  content,
  headings,
  previous,
  next,
}: {
  page: DocsPage;
  /** Both languages are rendered on the server; the reader's choice picks one. */
  content: Record<DocsLanguage, ReactNode>;
  headings: Record<DocsLanguage, DocsHeading[]>;
  previous: DocsPage | null;
  next: DocsPage | null;
}) {
  const { language } = useLanguage();
  const t = COPY[language];
  const toc = headings[language];
  const active = useActiveHeading(toc.map((heading) => heading.id));

  return (
    <div className="flex">
      <article className="min-w-0 flex-1 px-5 py-10 sm:px-10 lg:px-12" lang={language === "zh" ? "zh-CN" : "en"}>
        <h1 className="font-display border-b border-line pb-6 text-display-lg text-ink">{page.title[language]}</h1>
        <div className="docs-prose mt-8">{content[language]}</div>

        {/* Two cells divided by hairlines, not two cards. */}
        <nav className="mt-14 grid rounded-sm border border-line-2 bg-white/25 sm:grid-cols-2 sm:divide-x sm:divide-line max-sm:divide-y max-sm:divide-line" aria-label="Previous and next">
          {previous ? (
            <Link href={`/docs/${previous.slug}`} className="flex flex-col items-start px-5 py-4 transition-colors duration-150 hover:bg-white/50">
              <span className="text-caption text-ink-3">← {t.previous}</span>
              <span className="text-body-md font-medium">{previous.title[language]}</span>
            </Link>
          ) : null}
          {next && (
            <Link href={`/docs/${next.slug}`} className="col-start-2 flex flex-col items-end px-5 py-4 text-right transition-colors duration-150 hover:bg-white/50 max-sm:col-start-1">
              <span className="text-caption text-ink-3">{t.next} →</span>
              <span className="text-body-md font-medium">{next.title[language]}</span>
            </Link>
          )}
        </nav>
      </article>

      {toc.length > 0 && (
        <aside className="hidden w-56 shrink-0 border-l border-line xl:block">
          <div className="sticky top-16 px-5 py-10">
            <p className="lead text-ink-3">{t.onThisPage}</p>
            <ul className="mt-2 space-y-1 border-l border-line">
              {toc.map((heading) => (
                <li key={heading.id}>
                  <a
                    href={`#${heading.id}`}
                    className={cn(
                      "-ml-px block border-l-2 py-0.5 text-body-sm leading-snug",
                      heading.depth === 3 ? "pl-6" : "pl-3",
                      active === heading.id
                        ? "border-ink font-medium text-ink"
                        : "border-transparent text-ink-3 hover:text-ink",
                    )}
                  >
                    {heading.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      )}
    </div>
  );
}
