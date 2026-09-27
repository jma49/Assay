"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { Moon, Search, Sun } from "lucide-react";
import { BrandMark } from "@/components/common/BrandMark";
import { useLanguage } from "@/components/common/LanguageProvider";
import { DOCS_NAV } from "@/lib/docs/nav";
import type { DocsSearchEntry } from "@/lib/docs/content";
import { GITHUB_URL } from "@/lib/brand";
import { cn } from "@/lib/utils/utils";

const COPY = {
  en: { help: "Assay Help", search: "Search docs", noResults: "No matches", openApp: "Open Assay", contents: "Contents", close: "Close window" },
  zh: { help: "Assay 帮助", search: "搜索文档", noResults: "没有找到", openApp: "打开 Assay", contents: "目录", close: "关闭窗口" },
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
      <Search className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="search"
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
        className="h-8 w-full rounded-md border border-input bg-card pr-3 pl-8 text-[13px] shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
      />
      {query.trim() && (
        <ul className="absolute top-full right-0 z-50 mt-1.5 w-[340px] rounded-lg border bg-popover p-1 text-popover-foreground shadow-md" role="listbox">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-[13px] text-muted-foreground">{t.noResults}</li>
          ) : (
            results.map((result, i) => (
              <li key={result.href + i} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(result.href)}
                  className={cn(
                    "block w-full rounded-[3px] px-3 py-1.5 text-left",
                    i === active && "bg-muted",
                  )}
                >
                  <span className="block truncate text-[13px] font-medium">{result.title}</span>
                  <span className={cn("block truncate text-[12px]", "text-muted-foreground")}>
                    {result.context}
                  </span>
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
    <nav aria-label="Docs" className="space-y-5">
      {DOCS_NAV.map((group) => (
        <div key={group.title.en}>
          <p className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {group.title[language]}
          </p>
          <ul>
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
                      "block rounded-[4px] px-3 py-1 text-[13px]",
                      current ? "bg-primary-soft font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
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

/** Docs: a top bar with search, the table of contents on the left, the page beside it. */
export function DocsShell({ index, children }: { index: DocsSearchEntry[]; children: ReactNode }) {
  const { language, setLanguage } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [contentsOpen, setContentsOpen] = useState(false);
  useEffect(() => setMounted(true), []);
  const t = COPY[language];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-5 px-4 sm:px-6 lg:px-8">
          <Link href="/">
            <BrandMark />
          </Link>
          <Link href="/docs" className="text-[13.5px] font-medium whitespace-nowrap max-sm:hidden">
            {t.help}
          </Link>
          <a href={GITHUB_URL} className="text-[13.5px] text-muted-foreground hover:text-foreground max-sm:hidden">
            GitHub
          </a>
          <div className="ml-auto flex items-center gap-2 whitespace-nowrap">
            <div className="max-md:hidden">
              <DocsSearch index={index} />
            </div>
            <button
              type="button"
              className="h-8 rounded-md px-2 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
            >
              {language === "zh" ? "EN" : "中文"}
            </button>
            <button
              type="button"
              aria-label="Toggle color theme"
              className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              {mounted && resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <Link
              href="/manage-scripts"
              className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground shadow-xs hover:brightness-110"
            >
              {t.openApp}
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl gap-8 px-4 sm:px-6 lg:px-8">
        <aside
          className={cn(
            "sticky top-14 h-[calc(100dvh-3.5rem)] w-56 shrink-0 overflow-y-auto py-8 max-lg:fixed max-lg:inset-y-14 max-lg:left-0 max-lg:z-30 max-lg:h-auto max-lg:border-r max-lg:bg-card max-lg:px-3 max-lg:shadow-md",
            !contentsOpen && "max-lg:hidden",
          )}
        >
          <DocsSidebar onNavigate={() => setContentsOpen(false)} />
        </aside>
        <div className="min-w-0 flex-1 py-6">
          <div className="mb-4 flex items-center gap-2 lg:hidden">
            <button
              type="button"
              className="inline-flex h-8 items-center rounded-md border border-border-strong bg-card px-3 text-[13px] shadow-xs"
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
  );
}
