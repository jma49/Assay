import { Code, Crown, Eye, Shield, type LucideIcon } from "lucide-react";
import { UserRole } from "@/lib/types/approval";
import { usersCopy } from "./copy";

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

export const ALL_ROLES = Object.values(UserRole);

const ROLE_STYLE: Record<UserRole, Pick<RoleInfo, "icon" | "color">> = {
  [UserRole.ADMIN]: { icon: Crown, color: "bg-failure/10 text-failure border-failure/30" },
  [UserRole.MANAGER]: { icon: Shield, color: "bg-muted text-foreground border-border" },
  [UserRole.DEVELOPER]: { icon: Code, color: "bg-success/10 text-success border-success/30" },
  [UserRole.VIEWER]: { icon: Eye, color: "bg-muted text-foreground border-border" },
};

export function getRoleInfo(role: UserRole, language: string): RoleInfo {
  return { ...usersCopy(language).roles[role], ...ROLE_STYLE[role] };
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
