"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AquaWallpaper } from "@/components/common/AquaWallpaper";
import { useLanguage } from "@/components/common/LanguageProvider";
import {
  dashboardTranslations,
  type DashboardTranslationKeys,
} from "@/components/business/dashboard/types";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils/utils";

// Longest prefix first, so nested pages resolve to their own section.
const SECTIONS: [string, DashboardTranslationKeys][] = [
  ["/manage-scripts/approvals", "navigationApprovals"],
  ["/manage-scripts", "navigationScripts"],
  ["/scripts", "navigationScripts"],
  ["/data-analysis", "navigationAnalysis"],
  ["/admin/users", "navigationUsers"],
  ["/dashboard", "navigationDashboard"],
];

/**
 * Every signed-in page opens as one Aqua window on the desktop picture, as
 * in JM/OS. The window only frames the page; each page keeps its own layout.
 */
export function AppWindow({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const { language } = useLanguage();
  const key = SECTIONS.find(([prefix]) => pathname.startsWith(prefix))?.[1];
  const labels = dashboardTranslations[language] ?? dashboardTranslations.en;
  const title = key ? `${BRAND} — ${labels[key as keyof typeof labels] ?? key}` : BRAND;

  return (
    <div className="relative">
      <AquaWallpaper className="fixed [contain:strict] [transform:translateZ(0)]" />
      <div className={cn(APP_CONTAINER, "relative max-sm:px-2 py-5 sm:py-8")}>
        <div className="aqua-window overflow-hidden rounded-[7px]">
          <div className="aqua-titlebar relative flex h-[26px] items-center justify-center px-20 text-[13px]">
            <span className="aqua-lights absolute left-2.5" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            <span className="truncate">{title}</span>
          </div>
          <div className="[background:var(--aqua-pinstripe),var(--background)] pb-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
