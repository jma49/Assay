"use client";

import { useLanguage } from "@/components/common/LanguageProvider";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { CoveragePanes, useCoverage } from "./CoveragePanes";

/** Which tables have a check watching them, and a way to add one where none does. */
export function CoverageView() {
  const { language } = useLanguage();
  const coverage = useCoverage(true);
  return (
    <div className={`${APP_CONTAINER} py-6`}>
      <div className="flex h-[calc(100dvh-10rem)] min-h-[420px] overflow-hidden rounded-xl bg-card shadow-border max-xl:h-auto max-xl:flex-col">
        <CoveragePanes
          coverage={coverage}
          scripts={[]}
          searchTerm=""
          language={language}
          checkHref={(scriptId) => `/checks/${encodeURIComponent(scriptId)}`}
        />
      </div>
    </div>
  );
}
