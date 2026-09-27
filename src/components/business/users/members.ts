import { Code, Crown, Eye, Shield, type LucideIcon } from "lucide-react";
import { UserRole } from "@/lib/types/approval";
import type { DashboardTranslationKeys } from "@/components/business/dashboard/types";

/** A member as `GET /api/users/roles` returns them. */
export interface MemberRole {
  userId: string;
  email: string;
  role: UserRole;
  assignedBy: string;
  assignedAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface RoleInfo {
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

type Translate = (key: DashboardTranslationKeys) => string;

export const ALL_ROLES = Object.values(UserRole);

export function getRoleInfo(role: UserRole, t: Translate): RoleInfo {
  return {
    [UserRole.ADMIN]: {
      label: t("adminRole"),
      description: t("adminDesc"),
      icon: Crown,
      color: "bg-failure/10 text-failure border-failure/30",
    },
    [UserRole.MANAGER]: {
      label: t("managerRole"),
      description: t("managerDesc"),
      icon: Shield,
      color: "bg-muted text-foreground border-border",
    },
    [UserRole.DEVELOPER]: {
      label: t("developerRole"),
      description: t("developerDesc"),
      icon: Code,
      color: "bg-success/10 text-success border-success/30",
    },
    [UserRole.VIEWER]: {
      label: t("viewerRole"),
      description: t("viewerDesc"),
      icon: Eye,
      color: "bg-muted text-foreground border-border",
    },
  }[role];
}

/** How many members hold each role, in `ALL_ROLES` order. */
export function countByRole(members: MemberRole[]): Record<UserRole, number> {
  const counts = Object.fromEntries(ALL_ROLES.map((role) => [role, 0])) as Record<UserRole, number>;
  for (const member of members) {
    if (member.role in counts) counts[member.role] += 1;
  }
  return counts;
}

export interface PageSlice<T> {
  items: T[];
  /** The page actually shown: the requested one, kept within 1..totalPages. */
  page: number;
  totalPages: number;
  /** 1-based index of the first and last item shown. */
  start: number;
  end: number;
}

export function pageSlice<T>(items: T[], page: number, pageSize: number): PageSlice<T> {
  const totalPages = Math.ceil(items.length / pageSize);
  // Removing the last member of the last page must not strand the view on an empty page.
  const shown = Math.min(Math.max(page, 1), Math.max(totalPages, 1));
  const startIndex = (shown - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return {
    items: items.slice(startIndex, endIndex),
    page: shown,
    totalPages,
    start: startIndex + 1,
    end: Math.min(endIndex, items.length),
  };
}

/** Fills the `pageInfo` template: shown range, total, current page, page count. */
export function formatPageInfo(template: string, values: number[]): string {
  return values.reduce<string>((text, value) => text.replace("%s", String(value)), template);
}

/** The page a "jump to page" input points at, or null when it is not a valid page. */
export function parsePageJump(input: string, totalPages: number): number | null {
  const page = parseInt(input, 10);
  return !isNaN(page) && page >= 1 && page <= totalPages ? page : null;
}

const EDITING_KEYS = ["ArrowLeft", "ArrowRight", "Delete", "Backspace", "Tab"];

/** Keys the page-jump input accepts: digits and editing keys. */
export function isPageJumpKey(key: string): boolean {
  return /[\d\b]/.test(key) || EDITING_KEYS.includes(key);
}
