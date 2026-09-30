"use client";

import { useState } from "react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { DataSourceSelect } from "@/components/checks/data-source/DataSourceSelect";
import { pickSource, useDataSourceOptions } from "@/components/checks/data-source/useDataSourceOptions";
import { DEFAULT_SOURCE_ID } from "@/domain/data-source";
import { CoveragePanes, useCoverage } from "./CoveragePanes";

/** Which tables of a data source have a check watching them, and a way to add one where none does. */
export function CoverageView() {
  const { language } = useLanguage();
  const sources = useDataSourceOptions(language);
  const [chosen, setChosen] = useState(DEFAULT_SOURCE_ID);
  const sourceId = pickSource(chosen, sources);
  const coverage = useCoverage(true, sourceId);
  return (
    <div className={`${APP_CONTAINER} space-y-4 py-6`}>
      {sources.length > 1 && (
        <div className="max-w-xs">
          <DataSourceSelect id="coverage-source" value={sourceId} options={sources} onChange={setChosen} language={language} withHint={false} />
        </div>
      )}
      <div className="flex h-[calc(100dvh-10rem)] min-h-[420px] overflow-hidden rounded-xl bg-card shadow-border max-xl:h-auto max-xl:flex-col">
        <CoveragePanes
          coverage={coverage}
          scripts={[]}
          searchTerm=""
          language={language}
          checkHref={(scriptId) => `/checks/${encodeURIComponent(scriptId)}`}
          sourceId={sourceId}
        />
      </div>
    </div>
  );
}
