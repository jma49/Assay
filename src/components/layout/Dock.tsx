"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  ClipboardCheck,
  FileCode2,
  FlaskConical,
  LayoutDashboard,
  Users,
} from "lucide-react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { dashboardTranslations } from "@/components/business/dashboard/types";

interface DockItem {
  href: string;
  label: { en: string; zh: string } | keyof typeof dashboardTranslations.en;
  Icon: LucideIcon;
  /** Top and bottom of the tile's gel. */
  tint: [string, string];
}

const ITEMS: DockItem[] = [
  { href: "/dashboard", label: "navigationDashboard", Icon: LayoutDashboard, tint: ["#6fb0ff", "#1d5fd0"] },
  { href: "/manage-scripts", label: "navigationScripts", Icon: FileCode2, tint: ["#b8c0cc", "#56606e"] },
  { href: "/scripts/new", label: { en: "New check", zh: "新建检查" }, Icon: FlaskConical, tint: ["#8fe07a", "#2c8a1f"] },
  { href: "/data-analysis", label: "navigationAnalysis", Icon: BarChart3, tint: ["#c9a2ff", "#6a36c4"] },
  { href: "/manage-scripts/approvals", label: "navigationApprovals", Icon: ClipboardCheck, tint: ["#ffd07a", "#d27a0b"] },
  { href: "/admin/users", label: "navigationUsers", Icon: Users, tint: ["#7fe0e0", "#15878f"] },
];

function isCurrent(pathname: string, href: string) {
  // "/manage-scripts" must not light up for its nested approvals page.
  if (href === "/manage-scripts") return pathname === href;
  return pathname.startsWith(href);
}

/** A Mac OS X Dock with the app's sections, magnifying under the pointer. */
export function Dock() {
  const pathname = usePathname() ?? "";
  const { language } = useLanguage();
  const labels = dashboardTranslations[language] ?? dashboardTranslations.en;

  return (
    <nav aria-label={language === "zh" ? "程序坞" : "Dock"} className="aqua-dock-wrap">
      <ul className="aqua-dock">
        {ITEMS.map(({ href, label, Icon, tint }) => {
          const text = typeof label === "string" ? labels[label] : label[language];
          const current = isCurrent(pathname, href);
          return (
            <li key={href} className="aqua-dock-item">
              <Link
                href={href}
                aria-label={text}
                aria-current={current ? "page" : undefined}
                className="aqua-dock-tile"
                style={{ background: `linear-gradient(${tint[0]}, ${tint[1]})` }}
              >
                <Icon className="size-[26px] text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]" strokeWidth={2} />
              </Link>
              <span className="aqua-dock-label" aria-hidden>
                {text}
              </span>
              {current && <span className="aqua-dock-running" aria-hidden />}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
