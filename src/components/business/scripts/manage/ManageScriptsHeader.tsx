"use client";

import Link from "next/link";
import { History, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/PageHeader";
import { WindowStatusBar, WindowToolbar } from "@/components/layout/WindowChrome";
import type { DashboardTranslationKeys, SqlScript } from "@/components/business/dashboard/types";
import type { Language } from "./script-form";

interface ManageScriptsHeaderProps {
  scripts: SqlScript[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  language: Language;
  t: (key: DashboardTranslationKeys | string) => string;
}

/** Status bar with check counts, the page title and the search/history toolbar. */
export function ManageScriptsHeader({ scripts, searchTerm, onSearchChange, language, t }: ManageScriptsHeaderProps) {
  const scheduled = scripts.filter((script) => script.isScheduled).length;
  return (
    <>
      <WindowStatusBar>
        {language === "zh"
          ? `${scripts.length} 个检查 · ${scheduled} 个定时执行`
          : `${scripts.length} checks · ${scheduled} scheduled`}
      </WindowStatusBar>
      <PageHeader title={t("manageScriptsPageTitle")} description={t("manageScriptsPageDescription")} />

      <WindowToolbar>
        <div className="relative w-64 max-sm:w-full">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label={t("searchPlaceholder")}
            placeholder={t("searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 pl-8 text-[13px]"
          />
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/manage-scripts/edit-history">
            <History />
            {t("allScriptsHistory")}
          </Link>
        </Button>
      </WindowToolbar>
    </>
  );
}
