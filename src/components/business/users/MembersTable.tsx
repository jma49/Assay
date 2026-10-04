"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UserRole } from "@/lib/types/approval";
import { formatDate } from "@/lib/utils/datetime";
import { usersCopy } from "./copy";
import { ALL_ROLES, getRoleInfo, type MemberRole } from "./members";

interface MembersTableProps {
  members: MemberRole[];
  language: string;
  /** Id of the member whose role is being saved, if any. */
  actionLoading: string | null;
  onChangeRole: (userId: string, email: string, role: UserRole) => void;
  onRemoveRole: (userId: string, email: string) => void;
}

export function MembersTable({ members, language, actionLoading, onChangeRole, onRemoveRole }: MembersTableProps) {
  const copy = usersCopy(language);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-body-md">
        <thead>
          <tr className="border-b text-body-sm text-muted-foreground">
            <th className="h-10 px-6 text-left font-normal">{language === "zh" ? "用户" : "User"}</th>
            <th className="h-10 w-56 px-4 text-left font-normal">{language === "zh" ? "角色" : "Role"}</th>
            <th className="h-10 w-56 px-4 text-left font-normal">{copy.assignedBy}</th>
            <th className="h-10 w-32 px-6 text-right font-normal" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {members.map((userRole) => (
            <tr key={userRole.userId} className="hover:bg-muted/40">
              <td className="max-w-0 px-6 py-3">
                <p className="truncate font-medium">{userRole.email}</p>
                <p className="truncate font-mono text-caption text-muted-foreground">{userRole.userId}</p>
              </td>
              <td className="px-4 py-3">
                <Select
                  value={userRole.role}
                  onValueChange={(newRole: UserRole) =>
                    onChangeRole(userRole.userId, userRole.email, newRole)
                  }
                  disabled={actionLoading === userRole.userId}
                >
                  <SelectTrigger className="h-8 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {getRoleInfo(role, language).label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-4 py-3 text-body-sm text-muted-foreground">
                {userRole.assignedBy} · {formatDate(userRole.assignedAt, language)}
              </td>
              <td className="px-6 py-3 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveRole(userRole.userId, userRole.email)}
                  disabled={actionLoading === userRole.userId}
                  className="-mr-2 text-muted-foreground hover:bg-failure/10 hover:text-failure"
                >
                  {actionLoading === userRole.userId ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    copy.removeRole
                  )}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
