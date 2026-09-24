'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  UserPlus, 
  Shield, 
  Crown, 
  Code, 
  Eye, 
  MoreHorizontal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { UserRole } from "@/lib/types/approval";
import { useLanguage } from '@/components/common/LanguageProvider';
import { dashboardTranslations, DashboardTranslationKeys, ITEMS_PER_PAGE } from '@/components/business/dashboard/types';
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonPageHeader, SkeletonStatStrip, SkeletonTable } from "@/components/common/PageSkeletons";
import { APP_CONTAINER } from "@/components/layout/app-container";

// 角色信息映射
const getRoleInfo = (role: UserRole, t: (key: DashboardTranslationKeys) => string) => ({
  [UserRole.ADMIN]: {
    label: t('adminRole'),
    description: t('adminDesc'),
    icon: Crown,
    color: 'bg-failure/10 text-failure border-failure/30'
  },
  [UserRole.MANAGER]: {
    label: t('managerRole'),
    description: t('managerDesc'),
    icon: Shield,
    color: 'bg-muted text-foreground border-border'
  },
  [UserRole.DEVELOPER]: {
    label: t('developerRole'),
    description: t('developerDesc'),
    icon: Code,
    color: 'bg-success/10 text-success border-success/30'
  },
  [UserRole.VIEWER]: {
    label: t('viewerRole'),
    description: t('viewerDesc'),
    icon: Eye,
    color: 'bg-muted text-foreground border-border'
  }
}[role]);

interface UserRoleInfo {
  userId: string;
  email: string;
  role: UserRole;
  assignedBy: string;
  assignedAt: string;
  updatedAt: string;
  isActive: boolean;
}

export default function AdminUsersPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { language } = useLanguage();
  const [userRoles, setUserRoles] = useState<UserRoleInfo[]>([]);

  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("");

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.DEVELOPER);
  const [error, setError] = useState<string | null>(null);
  // Until the first load finishes, show placeholders rather than "no roles".
  const [hasLoaded, setHasLoaded] = useState(false);

  // 翻译函数
  const t = useCallback(
    (key: DashboardTranslationKeys): string => {
      const langTranslations = dashboardTranslations[language] || dashboardTranslations.en;
      return langTranslations[key as keyof typeof langTranslations] || key;
    },
    [language]
  );

  // 临时的ROLE_INFO对象以保持兼容性
  const ROLE_INFO = {
    [UserRole.ADMIN]: getRoleInfo(UserRole.ADMIN, t),
    [UserRole.MANAGER]: getRoleInfo(UserRole.MANAGER, t),
    [UserRole.DEVELOPER]: getRoleInfo(UserRole.DEVELOPER, t),
    [UserRole.VIEWER]: getRoleInfo(UserRole.VIEWER, t),
  };

  // 分页逻辑
  const totalUsers = userRoles.length;
  const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedUsers = userRoles.slice(startIndex, endIndex);

  // 分页相关函数
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageInput("");
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handlePageInputSubmit(e);
    }
    if (
      !/[\d\b]/.test(e.key) &&
      !["ArrowLeft", "ArrowRight", "Delete", "Backspace", "Tab"].includes(e.key)
    ) {
      e.preventDefault();
    }
  };

  // 格式化分页信息
  const formatPageInfo = () => {
    const start = startIndex + 1;
    const end = Math.min(endIndex, totalUsers);
    return t("pageInfo")
      .replace("%s", String(start))
      .replace("%s", String(end))
      .replace("%s", String(totalUsers))
      .replace("%s", String(currentPage))
      .replace("%s", String(totalPages));
  };

  // 检查当前用户权限
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
      return;
    }
  }, [isLoaded, user, router]);

  // 加载用户角色列表
  const loadUserRoles = useCallback(async () => {
    try {
      const response = await fetch('/api/users/roles');
      
      if (!response.ok) {
        if (response.status === 403) {
          setError('权限不足：只有管理员可以访问此页面');
          return;
        }
        throw new Error('获取用户角色列表失败');
      }

      const data = await response.json();
      setUserRoles(data.data || []);
      setError(null);
    } catch (error) {
      console.error('加载用户角色失败:', error);
      setError(error instanceof Error ? error.message : '加载失败');
      toast.error(language === "zh" ? "加载用户角色列表失败" : "Could not load user roles");
    } finally {
      setHasLoaded(true);
    }
  }, [language]);

  useEffect(() => {
    if (isLoaded && user) {
      loadUserRoles();
    }
  }, [isLoaded, user, loadUserRoles]);

  // 分配用户角色
  const assignRole = async () => {
    if (!newUserId || !newUserEmail || !selectedRole) {
      toast.error(language === "zh" ? "请填写所有字段" : "Fill in every field");
      return;
    }

    try {
      setActionLoading('assign');
      const response = await fetch('/api/users/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: newUserId,
          targetEmail: newUserEmail,
          role: selectedRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '分配角色失败');
      }

      toast.success(language === "zh" ? `用户 ${newUserEmail} 的角色已设置为 ${getRoleInfo(selectedRole, t).label}` : `${newUserEmail} is now ${getRoleInfo(selectedRole, t).label}`);
      setIsDialogOpen(false);
      setNewUserEmail('');
      setNewUserId('');
      setSelectedRole(UserRole.DEVELOPER);
      loadUserRoles(); // 重新加载列表
    } catch (error) {
      console.error('分配角色失败:', error);
      toast.error(error instanceof Error ? error.message : '分配角色失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 删除用户角色
  const removeRole = async (userId: string, email: string) => {
    if (!confirm(`确定要删除用户 ${email} 的角色吗？`)) {
      return;
    }

    try {
      setActionLoading(userId);
      const response = await fetch(`/api/users/roles?userId=${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '删除角色失败');
      }

      toast.success(language === "zh" ? `用户 ${email} 的角色已删除` : `Removed the role from ${email}`);
      loadUserRoles(); // 重新加载列表
    } catch (error) {
      console.error('删除角色失败:', error);
      toast.error(error instanceof Error ? error.message : '删除角色失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 修改用户角色
  const changeRole = async (userId: string, email: string, newRole: UserRole) => {
    try {
      setActionLoading(userId);
      const response = await fetch('/api/users/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: userId,
          targetEmail: email,
          role: newRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '修改角色失败');
      }

      toast.success(language === "zh" ? `用户 ${email} 的角色已修改为 ${getRoleInfo(newRole, t).label}` : `${email} is now ${getRoleInfo(newRole, t).label}`);
      loadUserRoles(); // 重新加载列表
    } catch (error) {
      console.error('修改角色失败:', error);
      toast.error(error instanceof Error ? error.message : '修改角色失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 统计角色数量
  const roleStats = {
    [UserRole.ADMIN]: userRoles.filter(u => u.role === UserRole.ADMIN).length,
    [UserRole.MANAGER]: userRoles.filter(u => u.role === UserRole.MANAGER).length,
    [UserRole.DEVELOPER]: userRoles.filter(u => u.role === UserRole.DEVELOPER).length,
    [UserRole.VIEWER]: userRoles.filter(u => u.role === UserRole.VIEWER).length,
  };

  if (!isLoaded) {
    return (
      <main className={`${APP_CONTAINER} space-y-6 py-8`} aria-busy="true">
        <SkeletonPageHeader withAction />
        <SkeletonStatStrip />
        <SkeletonTable rows={3} />
      </main>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen    ">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="space-y-6">
          <PageHeader
            title={t('userManagementTitle')}
            description={t('userManagementDesc')}
            actions={
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <UserPlus />
                          {t('addUserRole')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t('addUserRole')}</DialogTitle>
                          <DialogDescription>
                            {language === "zh" ? "为用户分配系统权限角色" : "Give a user a role in this workspace."}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="userId">{t('userIdField')}</Label>
                            <Input
                              id="userId"
                              value={newUserId}
                              onChange={(e) => setNewUserId(e.target.value)}
                              placeholder="user_xxx"
                            />
                          </div>
                          <div>
                            <Label htmlFor="email">{t('userEmail')}</Label>
                            <Input
                              id="email"
                              value={newUserEmail}
                              onChange={(e) => setNewUserEmail(e.target.value)}
                              placeholder="user@example.com"
                            />
                          </div>
                          <div>
                            <Label htmlFor="role">{t('selectRole')}</Label>
                            <Select value={selectedRole} onValueChange={(value: UserRole) => setSelectedRole(value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.values(UserRole).map((role) => {
                                  const roleInfo = ROLE_INFO[role];
                                  return (
                                    <SelectItem key={role} value={role}>
                                      <div className="flex items-center space-x-2">
                                        <roleInfo.icon className="h-4 w-4" />
                                        <span>{roleInfo.label}</span>
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            {language === "zh" ? "取消" : "Cancel"}
                          </Button>
                          <Button onClick={assignRole} disabled={actionLoading === 'assign'}>
                            {actionLoading === 'assign' && (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            {t('assignRole')}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
            }
          />

          {!hasLoaded ? <SkeletonStatStrip /> : (
          <dl className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(roleStats).map(([role, count]) => (
              <div key={role} className="space-y-1 bg-card px-5 py-4">
                <dt className="text-[13px] text-muted-foreground">{ROLE_INFO[role as UserRole].label}</dt>
                <dd className="font-serif text-[30px] leading-tight font-semibold tabular-nums">{count}</dd>
              </div>
            ))}
          </dl>
          )}

          {/* User List */}
          <Card className="relative overflow-hidden gap-0 py-0">
            <CardHeader className="relative border-b px-6 py-4">
              <CardTitle>
                {t('userList')} <span className="text-muted-foreground tabular-nums">{totalUsers}</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="relative p-0">
              {!hasLoaded ? (
                <SkeletonTable rows={3} withTitle={false} className="rounded-none border-0" />
              ) : totalUsers === 0 ? (
                <EmptyState
                  title={language === "zh" ? "暂无用户角色" : "No roles assigned yet"}
                  hint={language === "zh" ? "点击右上角按钮为用户分配角色" : "Use “Add user role” to give someone access."}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b text-[13px] text-muted-foreground">
                        <th className="h-10 px-6 text-left font-normal">{language === "zh" ? "用户" : "User"}</th>
                        <th className="h-10 w-56 px-4 text-left font-normal">{language === "zh" ? "角色" : "Role"}</th>
                        <th className="h-10 w-56 px-4 text-left font-normal">{t('assignedBy')}</th>
                        <th className="h-10 w-32 px-6 text-right font-normal" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {paginatedUsers.map((userRole) => (
                        <tr key={userRole.userId} className="hover:bg-muted/40">
                          <td className="max-w-0 px-6 py-3">
                            <p className="truncate font-medium">{userRole.email}</p>
                            <p className="truncate font-mono text-[12px] text-muted-foreground">{userRole.userId}</p>
                          </td>
                          <td className="px-4 py-3">
                            <Select
                              value={userRole.role}
                              onValueChange={(newRole: UserRole) =>
                                changeRole(userRole.userId, userRole.email, newRole)
                              }
                              disabled={actionLoading === userRole.userId}
                            >
                              <SelectTrigger className="h-8 w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.values(UserRole).map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {ROLE_INFO[role].label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-3 text-[13px] text-muted-foreground">
                            {userRole.assignedBy} · {new Date(userRole.assignedAt).toLocaleDateString(language === "zh" ? "zh-CN" : "en-US")}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRole(userRole.userId, userRole.email)}
                              disabled={actionLoading === userRole.userId}
                              className="-mr-2 text-muted-foreground hover:bg-failure/10 hover:text-failure"
                            >
                              {actionLoading === userRole.userId ? (
                                <Loader2 className="animate-spin" />
                              ) : (
                                t('removeRole')
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>

            {/* 分页 */}
            {totalPages > 1 && (
              <CardFooter className="flex flex-col sm:flex-row items-center justify-between border-t px-5 py-3 text-xs gap-2 relative z-10">
                <div className="text-muted-foreground text-center sm:text-left">
                  {formatPageInfo()}
                </div>
                <div className="flex items-center gap-2 relative z-20">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                    className="h-7 px-2 text-xs transition-all duration-150 relative z-30"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    <span className="hidden sm:inline">{t("previous")}</span>
                  </Button>

                  <div className="flex items-center gap-1.5 px-2 relative z-30">
                    <div className="hidden md:flex items-center gap-1">
                      {currentPage > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentPage(1)}
                          className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground relative z-40"
                          title={t("jumpToFirst")}
                        >
                          1
                        </Button>
                      )}
                      {currentPage > 3 && (
                        <span className="text-muted-foreground">...</span>
                      )}
                    </div>

                    <span className="text-muted-foreground text-xs">
                      {t("pageNumber")}
                    </span>
                    <span className="font-medium text-xs min-w-[1.5rem] text-center">
                      {currentPage}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {t("of")} {totalPages} {t("pages")}
                    </span>

                    <div className="hidden md:flex items-center gap-1">
                      {currentPage < totalPages - 2 && (
                        <span className="text-muted-foreground">...</span>
                      )}
                      {currentPage < totalPages && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground relative z-40"
                          title={t("jumpToLast")}
                        >
                          {totalPages}
                        </Button>
                      )}
                    </div>

                    {totalPages > 2 && (
                      <div className="hidden lg:flex items-center gap-1 ml-2 relative z-40">
                        <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                        <form
                          onSubmit={handlePageInputSubmit}
                          className="flex items-center gap-1"
                        >
                          <input
                            type="number"
                            min="1"
                            max={totalPages}
                            value={pageInput}
                            onChange={handlePageInputChange}
                            onKeyDown={handlePageInputKeyDown}
                            placeholder={t("jumpToPage")}
                            className="w-12 h-6 px-1 text-xs text-center border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring relative z-50"
                            style={{ pointerEvents: "auto" }}
                          />
                          <Button
                            type="submit"
                            variant="outline"
                            size="sm"
                            disabled={
                              !pageInput ||
                              isNaN(parseInt(pageInput, 10)) ||
                              parseInt(pageInput, 10) < 1 ||
                              parseInt(pageInput, 10) > totalPages
                            }
                            className="h-6 px-2 text-xs relative z-50"
                            title={t("pageJump")}
                            style={{ pointerEvents: "auto" }}
                          >
                            {t("pageJump")}
                          </Button>
                        </form>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage(Math.min(currentPage + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="h-7 px-2 text-xs transition-all duration-150 relative z-30"
                  >
                    <span className="hidden sm:inline">{t("next")}</span>
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
} 