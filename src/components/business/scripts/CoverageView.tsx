"use client";

import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/common/LanguageProvider";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { CoveragePanes, useCoverage } from "./CoveragePanes";

/** Which tables have a check watching them, and a way to add one where none does. */
export function CoverageView() {
  const router = useRouter();
  const { language } = useLanguage();
  const coverage = useCoverage(true);
  return (
    <div className={`${APP_CONTAINER} py-6`}>
      <div className="flex h-[calc(100dvh-10rem)] min-h-[420px] overflow-hidden rounded-xl border bg-card shadow-xs max-xl:h-auto max-xl:flex-col">
        <CoveragePanes
          coverage={coverage}
          scripts={[]}
          searchTerm=""
          language={language}
          onOpenCheck={(scriptId) => router.push(`/manage-scripts?scriptId=${encodeURIComponent(scriptId)}`)}
        />
      </div>
    </div>
  );
}
