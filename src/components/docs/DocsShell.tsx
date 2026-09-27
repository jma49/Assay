"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { Moon, Search, Sun } from "lucide-react";
import { AquaWallpaper } from "@/components/common/AquaWallpaper";
import { BrandMark } from "@/components/common/BrandMark";
import { TrafficLights } from "@/components/common/TrafficLights";
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
        className="aqua-field h-7 w-full rounded-full pr-3 pl-8 text-[13px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
      />
      {query.trim() && (
        <ul className="aqua-menu absolute top-full right-0 z-50 mt-1.5 w-[340px] p-1 text-popover-foreground" role="listbox">
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
                    i === active && "aqua-selected",
                  )}
                >
                  <span className="block truncate text-[13px] font-medium">{result.title}</span>
                  <span className={cn("block truncate text-[12px]", i === active ? "text-white/80" : "text-muted-foreground")}>
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
                      current ? "aqua-selected" : "text-foreground/85 hover:bg-foreground/[0.06]",
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

/**
 * Docs as a Mac OS X Help Viewer: a window on the Aqua desktop with a
 * source-list sidebar, a search field in the toolbar and the page beside it.
 */
export function DocsShell({ index, children }: { index: DocsSearchEntry[]; children: ReactNode }) {
  const { language, setLanguage } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [contentsOpen, setContentsOpen] = useState(false);
  useEffect(() => setMounted(true), []);
  const t = COPY[language];

  return (
    <div className="relative min-h-screen">
      <AquaWallpaper className="fixed" />

      <header className="aqua-menubar sticky top-0 z-40">
        <div className="mx-auto flex h-10 w-full max-w-7xl items-center gap-5 px-4 sm:px-6 lg:px-8">
          <Link href="/">
            <BrandMark className="[&_img]:size-[18px] [&_span:last-child]:text-[18px]" />
          </Link>
          <Link href="/docs" className="text-[14px] font-semibold whitespace-nowrap max-sm:hidden">
            {t.help}
          </Link>
          <a href={GITHUB_URL} className="text-[14px] text-foreground/80 hover:text-foreground max-sm:hidden">
            GitHub
          </a>
          <div className="ml-auto flex items-center gap-3 whitespace-nowrap text-foreground/85">
            <button
              type="button"
              className="h-8 px-1 text-[13px] hover:text-foreground"
              onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
            >
              {language === "zh" ? "EN" : "中文"}
            </button>
            <button
              type="button"
              aria-label="Toggle color theme"
              className="grid size-8 place-items-center hover:text-foreground"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              {mounted && resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <Link href="/dashboard" className="aqua-pill inline-flex h-7 items-center px-3 text-[13px] whitespace-nowrap">
              {t.openApp}
            </Link>
          </div>
        </div>
      </header>

      <div className="relative mx-auto w-full max-w-7xl px-2 pt-5 pb-16 sm:px-6 sm:pt-8 lg:px-8">
        <div className="aqua-window overflow-hidden rounded-[7px]">
          <div className="aqua-titlebar relative flex h-[26px] items-center justify-center px-20 text-[13px] select-none">
            <TrafficLights
              className="absolute left-2.5"
              close={{ label: t.close, onClick: () => window.location.assign("/") }}
            />
            <span className="truncate">{t.help}</span>
          </div>
          {/* Unified toolbar under the title bar, as in the Help Viewer. */}
          <div className="flex h-11 items-center gap-3 border-b border-[var(--aqua-title-line)] bg-[image:var(--aqua-title)] px-3">
            <button
              type="button"
              className="aqua-pill inline-flex h-7 items-center px-3 text-[13px] lg:hidden"
              aria-expanded={contentsOpen}
              onClick={() => setContentsOpen((open) => !open)}
            >
              {t.contents}
            </button>
            <div className="ml-auto flex w-full justify-end">
              <DocsSearch index={index} />
            </div>
          </div>
          <div className="relative flex min-h-[70vh] bg-card">
            <aside
              className={cn(
                "w-60 shrink-0 border-r bg-sidebar px-2 py-5 max-lg:absolute max-lg:z-30 max-lg:h-full max-lg:shadow-xl",
                !contentsOpen && "max-lg:hidden",
              )}
            >
              <DocsSidebar onNavigate={() => setContentsOpen(false)} />
            </aside>
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
