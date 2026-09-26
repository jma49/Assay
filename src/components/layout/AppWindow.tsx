"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AquaWallpaper } from "@/components/common/AquaWallpaper";
import { TrafficLights } from "@/components/common/TrafficLights";
import { useLanguage } from "@/components/common/LanguageProvider";
import {
  dashboardTranslations,
  type DashboardTranslationKeys,
} from "@/components/business/dashboard/types";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils/utils";

const ZOOM_KEY = "assay-window-zoomed";

const LIGHT_LABELS = {
  en: { close: "Close window", minimize: "Collapse window", zoom: "Zoom window" },
  zh: { close: "关闭窗口", minimize: "收起窗口", zoom: "缩放窗口" },
};

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
 *
 * Close leaves for the landing page. Minimise collapses the window to its
 * title bar ("window shade", also on double-clicking the title bar), and zoom
 * widens it to the full screen; the zoom choice is remembered.
 */
export function AppWindow({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const { language } = useLanguage();
  const key = SECTIONS.find(([prefix]) => pathname.startsWith(prefix))?.[1];
  const labels = dashboardTranslations[language] ?? dashboardTranslations.en;
  const title = key ? `${BRAND} — ${labels[key as keyof typeof labels] ?? key}` : BRAND;
  const lightLabels = LIGHT_LABELS[language] ?? LIGHT_LABELS.en;

  const [shaded, setShaded] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    try {
      setZoomed(localStorage.getItem(ZOOM_KEY) === "1");
    } catch {
      // Storage blocked: the window just starts unzoomed.
    }
  }, []);

  const toggleZoom = () => {
    setZoomed((current) => {
      const next = !current;
      try {
        localStorage.setItem(ZOOM_KEY, next ? "1" : "0");
      } catch {
        // Storage blocked: the zoom still applies to this visit.
      }
      return next;
    });
  };

  // A full page load, so pages that guard unsaved work can still ask first.
  const close = () => window.location.assign("/");

  return (
    <div className="relative">
      <AquaWallpaper className="fixed" />
      {/* md:pb-28 leaves room so the Dock never covers the end of the window. */}
      <div
        className={cn(
          APP_CONTAINER,
          "relative max-sm:px-2 py-5 sm:py-8 md:pb-28",
          zoomed && "max-w-none",
        )}
      >
        <div className="aqua-window overflow-hidden rounded-[7px]">
          <div
            className="aqua-titlebar relative flex h-[26px] items-center justify-center px-20 text-[13px] select-none"
            onDoubleClick={() => setShaded((value) => !value)}
          >
            <TrafficLights
              className="absolute left-2.5"
              close={{ label: lightLabels.close, onClick: close }}
              minimize={{ label: lightLabels.minimize, onClick: () => setShaded((value) => !value) }}
              zoom={{ label: lightLabels.zoom, onClick: toggleZoom }}
            />
            <span className="truncate">{title}</span>
          </div>
          {/* Hidden rather than unmounted, so a collapsed page keeps its state. */}
          <div className="[background:var(--aqua-pinstripe),var(--background)] pb-10" hidden={shaded}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
