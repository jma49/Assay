'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { WindowStatusBar } from "@/components/layout/WindowChrome";
import { useCurrentUser } from "@/lib/auth/client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserRole } from "@/lib/types/approval";
import { useLanguage } from '@/components/common/LanguageProvider';
import { dashboardTranslations, DashboardTranslationKeys, ITEMS_PER_PAGE } from '@/components/business/dashboard/types';
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonPageHeader, SkeletonStatStrip, SkeletonTable } from "@/components/common/PageSkeletons";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { AddRoleDialog } from "@/components/business/users/AddRoleDialog";
import { MembersPagination } from "@/components/business/users/MembersPagination";
import { MembersTable } from "@/components/business/users/MembersTable";
import { RoleStats } from "@/components/business/users/RoleStats";
import { countByRole, formatPageInfo, pageSlice } from "@/components/business/users/members";
import { useMemberRoles } from "@/components/business/users/useMemberRoles";

export default function AdminUsersPage() {
  const { user, isLoaded } = useCurrentUser();
  const router = useRouter();
  const { language } = useLanguage();
  const [currentPage, setCurrentPage] = useState(1);

  const t = useCallback(
    (key: DashboardTranslationKeys): string => {
      const langTranslations = dashboardTranslations[language] || dashboardTranslations.en;
      return langTranslations[key as keyof typeof langTranslations] || key;
    },
    [language]
  );

  const { members, error, hasLoaded, actionLoading, assignRole, changeRole, removeRole } = useMemberRoles(language, t);

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
          <WindowStatusBar>
            {language === "zh"
              ? `${totalUsers} 位用户 · ${roleCounts[UserRole.ADMIN]} 位管理员`
              : `${totalUsers} users · ${roleCounts[UserRole.ADMIN]} admins`}
          </WindowStatusBar>
          <PageHeader
            title={t('userManagementTitle')}
            description={t('userManagementDesc')}
            actions={
              <AddRoleDialog language={language} t={t} isSaving={actionLoading === 'assign'} onAssign={assignRole} />
            }
          />

          <RoleStats counts={roleCounts} t={t} />

          <Card className="relative overflow-hidden gap-0 py-0">
            <CardHeader className="relative border-b px-6 py-4">
              <CardTitle>
                {t('userList')} <span className="text-muted-foreground tabular-nums">{totalUsers}</span>
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
                  t={t}
                  actionLoading={actionLoading}
                  onChangeRole={changeRole}
                  onRemoveRole={removeRole}
                />
              )}
            </CardContent>

            {page.totalPages > 1 && (
              <MembersPagination
                currentPage={currentPage}
                totalPages={page.totalPages}
                pageInfo={formatPageInfo(t("pageInfo"), [page.start, page.end, totalUsers, currentPage, page.totalPages])}
                t={t}
                onPageChange={setCurrentPage}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
