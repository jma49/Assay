"use client";

import Link from "next/link";
import { History, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/PageHeader";
import { WindowStatusBar, WindowToolbar } from "@/components/layout/WindowChrome";
import type { CheckDefinition } from "@/components/runs/types";
import type { Language } from "./check-form";
import { manageCopy } from "./copy";

interface ManageScriptsHeaderProps {
  scripts: CheckDefinition[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  language: Language;
}

/** Status bar with check counts, the page title and the search/history toolbar. */
export function ManageChecksHeader({ scripts, searchTerm, onSearchChange, language }: ManageScriptsHeaderProps) {
  const t = manageCopy(language);
  const scheduled = scripts.filter((script) => script.isScheduled).length;
  return (
    <>
      <WindowStatusBar>
        {language === "zh"
          ? `${scripts.length} 个检查 · ${scheduled} 个定时执行`
          : `${scripts.length} checks · ${scheduled} scheduled`}
      </WindowStatusBar>
      <PageHeader title={t.title} description={t.description} />

      <WindowToolbar>
        <div className="relative w-64 max-sm:w-full">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label={t.search}
            placeholder={t.search}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 pl-8 text-body-sm"
          />
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/checks/manage/history">
            <History />
            {t.allHistory}
          </Link>
        </Button>
      </WindowToolbar>
    </>
  );
}
