"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { dashboardTranslations } from "@/components/business/dashboard/types";

interface DockItem {
  href: string;
  label: { en: string; zh: string } | keyof typeof dashboardTranslations.en;
  /** Crystal Clear icons (LGPL) in public/dock; see THIRD_PARTY_NOTICES.md. */
  icon: string;
}

const ITEMS: DockItem[] = [
  { href: "/dashboard", label: "navigationDashboard", icon: "/dock/dashboard.png" },
  { href: "/manage-scripts", label: "navigationScripts", icon: "/dock/scripts.svg" },
  { href: "/scripts/new", label: { en: "New Check", zh: "新建检查" }, icon: "/dock/new-check.png" },
  { href: "/data-analysis", label: "navigationAnalysis", icon: "/dock/analysis.png" },
  { href: "/manage-scripts/approvals", label: "navigationApprovals", icon: "/dock/approvals.svg" },
  { href: "/admin/users", label: "navigationUsers", icon: "/dock/users.png" },
];

// Magnification: an icon right under the pointer grows to MAX_SCALE, and the
// effect fades out over RADIUS pixels either side, so neighbours grow a little.
// 1.3 keeps the 128 px icons sharp on 2x screens at full size (50 px x 1.3).
const MAX_SCALE = 1.3;
const RADIUS = 150;
// Stop the launch bounce even if the page never reports that it arrived.
const BOUNCE_TIMEOUT_MS = 4000;

function isCurrent(pathname: string, href: string) {
  // "/manage-scripts" must not light up for its nested approvals page.
  if (href === "/manage-scripts") return pathname === href;
  return pathname.startsWith(href);
}

function scaleAt(distance: number) {
  const t = Math.min(Math.abs(distance) / RADIUS, 1);
  // Cosine falloff: smooth at the centre and at the edge of the radius.
  return 1 + (MAX_SCALE - 1) * (Math.cos(t * Math.PI) + 1) / 2;
}

/** The Mac OS X Dock: the app's sections, magnifying under the pointer. */
export function Dock() {
  const pathname = usePathname() ?? "";
  const { language } = useLanguage();
  const labels = dashboardTranslations[language] ?? dashboardTranslations.en;
  const listRef = useRef<HTMLUListElement>(null);
  const frameRef = useRef(0);
  const [launching, setLaunching] = useState<string | null>(null);

  // The page arrived (or we gave up waiting): stop bouncing.
  useEffect(() => {
    setLaunching(null);
  }, [pathname]);
  useEffect(() => {
    if (!launching) return;
    const timer = setTimeout(() => setLaunching(null), BOUNCE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [launching]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  // Magnification follows the pointer directly, so it stays on with reduced
  // motion (as on the Mac); that setting only drops the easing and the bounce.
  const canMagnify = () => window.matchMedia("(hover: hover) and (min-width: 768px)").matches;

  // Scales are written straight to CSS variables, so following the pointer
  // never re-renders React.
  const setScales = (pointerX: number | null) => {
    const list = listRef.current;
    if (!list) return;
    list.toggleAttribute("data-tracking", pointerX !== null);
    for (const item of Array.from(list.children) as HTMLElement[]) {
      if (pointerX === null) {
        item.style.removeProperty("--s");
        continue;
      }
      const box = item.getBoundingClientRect();
      item.style.setProperty("--s", scaleAt(pointerX - (box.left + box.width / 2)).toFixed(3));
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLUListElement>) => {
    if (event.pointerType !== "mouse" || !canMagnify()) return;
    const x = event.clientX;
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => setScales(x));
  };

  const onPointerLeave = () => {
    cancelAnimationFrame(frameRef.current);
    setScales(null);
  };

  // Arrow keys, Home and End move between icons, like a toolbar.
  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const links = Array.from(listRef.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []);
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (index === -1) return;
    const next =
      event.key === "ArrowRight" ? (index + 1) % links.length
      : event.key === "ArrowLeft" ? (index - 1 + links.length) % links.length
      : event.key === "Home" ? 0
      : event.key === "End" ? links.length - 1
      : -1;
    if (next === -1) return;
    event.preventDefault();
    links[next].focus();
  };

  const onLaunch = (event: MouseEvent<HTMLAnchorElement>, href: string, current: boolean) => {
    // Modified clicks open elsewhere; the current section is already open.
    if (current || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    setLaunching(href);
  };

  return (
    <nav aria-label={language === "zh" ? "程序坞" : "Dock"} className="aqua-dock-wrap">
      <ul
        ref={listRef}
        className="aqua-dock"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onKeyDown={onKeyDown}
      >
        {ITEMS.map(({ href, label, icon }) => {
          const text = typeof label === "string" ? labels[label] : label[language];
          const current = isCurrent(pathname, href);
          return (
            <li key={href} className="aqua-dock-item" data-launching={launching === href ? "" : undefined}>
              <Link
                href={href}
                aria-label={text}
                aria-current={current ? "page" : undefined}
                className="aqua-dock-link"
                onClick={(event) => onLaunch(event, href, current)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- small static SVGs need no optimisation */}
                <img src={icon} alt="" width={128} height={128} draggable={false} />
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
