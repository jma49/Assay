"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { BrandMark } from "@/components/common/BrandMark";
import { useLanguage } from "@/components/common/LanguageProvider";
import { DOCS_NAV } from "@/lib/docs/nav";
import type { DocsSearchEntry } from "@/lib/docs/content";
import { GITHUB_URL } from "@/lib/brand";
import { cn } from "@/lib/utils/utils";

const COPY = {
  en: { help: "Assay Help", search: "Search docs", noResults: "No matches", openApp: "Open Assay", contents: "Contents" },
  zh: { help: "Assay 帮助", search: "搜索文档", noResults: "没有找到", openApp: "打开 Assay", contents: "目录" },
};

const MAX_RESULTS = 8;

function DocsSearch({ index }: { index: DocsSearchEntry[] }) {
  const { language } = useLanguage();
  const router = useRouter();
  const t = COPY[language];
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  // ⌘K / Ctrl+K focuses the field, as in most docs sites.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const hits: { href: string; title: string; context: string; rank: number }[] = [];
    for (const entry of index) {
      if (entry.language !== language) continue;
      if (entry.title.toLowerCase().includes(q)) {
        hits.push({ href: `/docs/${entry.slug}`, title: entry.title, context: entry.summary, rank: 0 });
      }
      for (const heading of entry.headings) {
        if (heading.text.toLowerCase().includes(q)) {
          hits.push({ href: `/docs/${entry.slug}#${heading.id}`, title: heading.text, context: entry.title, rank: 1 });
        }
      }
      if (!entry.title.toLowerCase().includes(q) && entry.summary.toLowerCase().includes(q)) {
        hits.push({ href: `/docs/${entry.slug}`, title: entry.title, context: entry.summary, rank: 2 });
      }
    }
    return hits.sort((a, b) => a.rank - b.rank).slice(0, MAX_RESULTS);
  }, [index, language, query]);

  const go = (href: string) => {
    setQuery("");
    inputRef.current?.blur();
    router.push(href);
  };

  return (
    <div className="relative w-full max-w-[260px]">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-3.5 -translate-y-1/2 text-room-ink-3" />
      <input
        ref={inputRef}
        type="search"
        data-slot="input"
        value={query}
        placeholder={`${t.search}  ⌘K`}
        aria-label={t.search}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") setActive((i) => Math.min(i + 1, results.length - 1));
          else if (event.key === "ArrowUp") setActive((i) => Math.max(i - 1, 0));
          else if (event.key === "Enter" && results[active]) go(results[active].href);
          else if (event.key === "Escape") setQuery("");
          else return;
          event.preventDefault();
        }}
        className="h-9 w-full rounded-sm border border-room-line-2 bg-room-900 pr-3 pl-8 text-body-sm text-room-ink placeholder:text-room-ink-3 outline-none focus-visible:outline-room-ink sm:text-body-sm"
      />
      {query.trim() && (
        <ul className="absolute top-full right-0 z-50 mt-1.5 w-[340px] rounded-sm bg-popover p-1 text-popover-foreground shadow-md" role="listbox">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-body-sm text-ink-2">{t.noResults}</li>
          ) : (
            results.map((result, i) => (
              <li key={result.href + i} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(result.href)}
                  className={cn("block w-full rounded-sm px-3 py-1.5 text-left", i === active && "bg-muted")}
                >
                  <span className="block truncate text-body-sm font-medium">{result.title}</span>
                  <span className="block truncate text-caption text-ink-3">{result.context}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";
  const { language } = useLanguage();
  return (
    <nav aria-label="Docs">
      {DOCS_NAV.map((group) => (
        <div key={group.title.en} className="border-b border-line px-3 pt-4 pb-3">
          <p className="lead px-2 pb-2 text-ink-3">{group.title[language]}</p>
          <ul className="flex flex-col gap-px">
            {group.pages.map((page) => {
              const href = `/docs/${page.slug}`;
              const current = pathname === href;
              return (
                <li key={page.slug}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "relative block rounded-sm px-2 py-1.5 text-body-sm transition-colors",
                      current ? "bg-face-hi font-medium text-ink" : "text-ink-2 hover:bg-white/50 hover:text-ink",
                    )}
                  >
                    {current && <span className="absolute inset-y-1 left-0 w-0.5 bg-ink" aria-hidden />}
                    {page.title[language]}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Docs: the same room and lit face as the app. The contents sit on the face's left, the page beside it. */
export function DocsShell({ index, children }: { index: DocsSearchEntry[]; children: ReactNode }) {
  const { language, setLanguage } = useLanguage();
  const [contentsOpen, setContentsOpen] = useState(false);
  const t = COPY[language];

  return (
    <div className="min-h-screen bg-room-950">
      <header className="sticky top-0 z-40 border-b border-room-line bg-room-950 text-room-ink">
        <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-5 px-4 sm:px-6">
          <Link href="/" className="shrink-0">
            <BrandMark className="[&>span:last-child]:text-room-ink" />
          </Link>
          <span className="h-5 w-px bg-room-line-2 max-sm:hidden" aria-hidden />
          <Link href="/docs" className="lead whitespace-nowrap text-room-ink-3 hover:text-room-ink max-sm:hidden">
            {t.help}
          </Link>
          <a href={GITHUB_URL} className="text-body-sm text-room-ink-3 hover:text-room-ink max-sm:hidden">
            GitHub
          </a>
          <div className="ml-auto flex items-center gap-2 whitespace-nowrap">
            <div className="max-md:hidden">
              <DocsSearch index={index} />
            </div>
            <button
              type="button"
              className="h-9 rounded-sm border border-transparent px-2.5 font-mono text-caption text-room-ink-2 hover:border-room-line-2 hover:bg-room-800 hover:text-room-ink"
              onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
            >
              {language === "zh" ? "EN" : "中文"}
            </button>
            <Link
              href="/checks"
              className="inline-flex h-9 items-center rounded-sm bg-room-ink px-3.5 text-body-sm font-medium text-room-950 transition-opacity hover:opacity-90"
            >
              {t.openApp}
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1400px] px-2 pb-2 max-md:px-0 max-md:pb-0">
        <div className="app-face flex min-h-[calc(100dvh-3.5rem)] max-md:min-h-[calc(100dvh-3.5rem)]">
          <aside
            className={cn(
              "sticky top-14 h-[calc(100dvh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-line bg-white/25 max-lg:fixed max-lg:inset-y-14 max-lg:left-0 max-lg:z-30 max-lg:h-auto max-lg:bg-face max-lg:shadow-md",
              !contentsOpen && "max-lg:hidden",
            )}
          >
            <DocsSidebar onNavigate={() => setContentsOpen(false)} />
          </aside>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3 sm:px-6 lg:hidden">
              <button
                type="button"
                className="inline-flex h-9 items-center rounded-sm border border-line-2 bg-white/40 px-3 text-body-sm text-ink"
                aria-expanded={contentsOpen}
                onClick={() => setContentsOpen((open) => !open)}
              >
                {t.contents}
              </button>
              <div className="ml-auto md:hidden">
                <DocsSearch index={index} />
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
