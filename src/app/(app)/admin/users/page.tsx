'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WindowStatusBar } from "@/components/layout/WindowChrome";
import { useCurrentUser } from "@/lib/auth/client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserRole } from "@/lib/types/approval";
import { useLanguage } from '@/components/common/LanguageProvider';
import { ITEMS_PER_PAGE } from '@/components/business/dashboard/types';
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { paginationCopy } from "@/components/common/pagination-copy";
import { SkeletonPageHeader, SkeletonStatStrip, SkeletonTable } from "@/components/common/PageSkeletons";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { AddRoleDialog } from "@/components/business/users/AddRoleDialog";
import { MembersTable } from "@/components/business/users/MembersTable";
import { RoleStats } from "@/components/business/users/RoleStats";
import { usersCopy } from "@/components/business/users/copy";
import { countByRole, pageSlice } from "@/components/business/users/members";
import { useMemberRoles } from "@/components/business/users/useMemberRoles";
import { formatPageInfo } from "@/lib/utils/pagination";

export default function AdminUsersPage() {
  const { user, isLoaded } = useCurrentUser();
  const router = useRouter();
  const { language } = useLanguage();
  const [currentPage, setCurrentPage] = useState(1);

  const copy = usersCopy(language);

  const { members, error, hasLoaded, actionLoading, assignRole, changeRole, removeRole } = useMemberRoles(language);

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
    }
  }, [isLoaded, user, router]);

  const totalUsers = members.length;
  const page = pageSlice(members, currentPage, ITEMS_PER_PAGE);
  const roleCounts = countByRole(members);

  if (!hasLoaded) {
    return (
      <main className={`${APP_CONTAINER} space-y-6 py-6`} aria-busy="true">
        <SkeletonPageHeader withAction />
        <SkeletonStatStrip />
        <SkeletonTable rows={3} />
      </main>
    );
  }

  if (error) {
    return (
      <div className={`${APP_CONTAINER} py-6`}>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen    ">
      <div className={`${APP_CONTAINER} py-6`}>
        <div className="space-y-6">
          <WindowStatusBar>
            {language === "zh"
              ? `${totalUsers} 位用户 · ${roleCounts[UserRole.ADMIN]} 位管理员`
              : `${totalUsers} ${totalUsers === 1 ? "member" : "members"} · ${roleCounts[UserRole.ADMIN]} ${roleCounts[UserRole.ADMIN] === 1 ? "admin" : "admins"}`}
          </WindowStatusBar>
          <PageHeader
            title={copy.title}
            description={copy.description}
            actions={
              <AddRoleDialog language={language} isSaving={actionLoading === 'assign'} onAssign={assignRole} />
            }
          />

          <RoleStats counts={roleCounts} language={language} label={language === "zh" ? "按角色统计的成员" : "Members by role"} />

          <Card className="relative overflow-hidden gap-0 py-0">
            <CardHeader className="relative border-b px-6 py-4">
              <CardTitle>
                {copy.userList} <span className="text-muted-foreground tabular-nums">{totalUsers}</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="relative p-0">
              {totalUsers === 0 ? (
                <EmptyState
                  title={language === "zh" ? "暂无用户角色" : "No roles assigned yet"}
                  hint={language === "zh" ? "点击右上角按钮为用户分配角色" : "Use “Add user role” to give someone access."}
                />
              ) : (
                <MembersTable
                  members={page.items}
                  language={language}
                  actionLoading={actionLoading}
                  onChangeRole={changeRole}
                  onRemoveRole={removeRole}
                />
              )}
            </CardContent>

            {page.totalPages > 1 && (
              <Pagination
                page={page.page}
                totalPages={page.totalPages}
                pageInfo={formatPageInfo(paginationCopy(language).pageInfo, {
                  start: page.start,
                  end: page.end,
                  totalItems: totalUsers,
                  page: page.page,
                  totalPages: page.totalPages,
                })}
                onPageChange={setCurrentPage}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
