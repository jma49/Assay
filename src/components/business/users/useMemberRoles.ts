import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiErrorText } from "@/client/api-errors";
import { sendJson } from "@/client/send-json";
import { UserRole } from "@/lib/types/approval";
import type { DashboardTranslationKeys } from "@/components/business/dashboard/types";
import { getRoleInfo, type MemberRole } from "./members";

export interface RoleAssignment {
  userId: string;
  email: string;
  role: UserRole;
}

/** Posts a role for a member; the server checks the caller may assign it. */
async function postRole({ userId, email, role }: RoleAssignment, fallbackError: string) {
  await sendJson("/api/users/roles", "POST", { targetUserId: userId, targetEmail: email, role }, fallbackError);
}

/** The members with a role, or "forbidden" when the caller is not an admin. */
async function fetchMembers(zh: boolean): Promise<MemberRole[] | "forbidden"> {
  const response = await fetch("/api/users/roles");
  if (response.status === 403) return "forbidden";
  if (!response.ok) throw new Error(zh ? "获取用户角色列表失败" : "Could not load user roles");
  const data = await response.json();
  return data.data || [];
}

/**
 * Loads the member list and assigns, changes and removes roles.
 * `actionLoading` is "assign" while the add dialog saves, or the id of the member being changed.
 */
export function useMemberRoles(language: string, t: (key: DashboardTranslationKeys) => string) {
  const zh = language === "zh";
  const [members, setMembers] = useState<MemberRole[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Until the first load finishes, show placeholders rather than "no roles".
  const [hasLoaded, setHasLoaded] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // State is only set once the response is in: this also runs from an effect.
  const loadMembers = useCallback(
    () =>
      fetchMembers(zh)
        .then((result) => {
          if (result === "forbidden") {
            setError(zh ? "权限不足：只有管理员可以访问此页面" : "Only admins can open this page.");
            return;
          }
          setMembers(result);
          setError(null);
        })
        .catch((err) => {
          console.error("[members] Loading user roles failed:", err);
          setError(err instanceof Error ? err.message : zh ? "加载失败" : "Loading failed");
          toast.error(zh ? "加载用户角色列表失败" : "Could not load user roles");
        })
        .finally(() => setHasLoaded(true)),
    [zh],
  );

  // No need to wait for the session: the proxy already guarantees a
  // signed-in user and the API checks the admin permission on the server.
  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  /** Resolves true when the role was saved, so the dialog can close and reset. */
  const assignRole = async (assignment: RoleAssignment): Promise<boolean> => {
    if (!assignment.userId || !assignment.email || !assignment.role) {
      toast.error(zh ? "请填写所有字段" : "Fill in every field");
      return false;
    }

    const failed = zh ? "分配角色失败" : "Could not assign the role";
    try {
      setActionLoading("assign");
      await postRole(assignment, failed);
      const label = getRoleInfo(assignment.role, t).label;
      toast.success(
        zh ? `用户 ${assignment.email} 的角色已设置为 ${label}` : `${assignment.email} is now ${label}`,
      );
      loadMembers();
      return true;
    } catch (err) {
      console.error("[members] Assigning a role failed:", err);
      toast.error(apiErrorText(err, zh ? "zh" : "en", failed));
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const changeRole = async (userId: string, email: string, role: UserRole) => {
    const failed = zh ? "修改角色失败" : "Could not change the role";
    try {
      setActionLoading(userId);
      await postRole({ userId, email, role }, failed);
      const label = getRoleInfo(role, t).label;
      toast.success(zh ? `用户 ${email} 的角色已修改为 ${label}` : `${email} is now ${label}`);
      loadMembers();
    } catch (err) {
      console.error("[members] Changing a role failed:", err);
      toast.error(apiErrorText(err, zh ? "zh" : "en", failed));
    } finally {
      setActionLoading(null);
    }
  };

  const removeRole = async (userId: string, email: string) => {
    if (!confirm(zh ? `确定要删除用户 ${email} 的角色吗？` : `Remove the role from ${email}?`)) {
      return;
    }

    const failed = zh ? "删除角色失败" : "Could not remove the role";
    try {
      setActionLoading(userId);
      await sendJson(`/api/users/roles?userId=${userId}`, "DELETE", undefined, failed);

      toast.success(zh ? `用户 ${email} 的角色已删除` : `Removed the role from ${email}`);
      loadMembers();
    } catch (err) {
      console.error("[members] Removing a role failed:", err);
      toast.error(apiErrorText(err, zh ? "zh" : "en", failed));
    } finally {
      setActionLoading(null);
    }
  };

  return { members, error, hasLoaded, actionLoading, assignRole, changeRole, removeRole };
}
