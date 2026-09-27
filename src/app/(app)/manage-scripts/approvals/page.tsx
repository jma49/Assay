'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { WindowStatusBar } from "@/components/layout/WindowChrome";
import { useCurrentUser } from "@/lib/auth/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/components/common/LanguageProvider';
import { dashboardTranslations, DashboardTranslationKeys } from '@/components/business/dashboard/types';
import { PageHeader } from "@/components/layout/PageHeader";
import { SkeletonCardList, SkeletonPageHeader } from "@/components/common/PageSkeletons";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { ApprovalDecisionDialog } from "@/components/business/approvals/ApprovalDecisionDialog";
import { ApprovalList } from "@/components/business/approvals/ApprovalList";
import type { ApprovalAction, ApprovalRequest } from "@/components/business/approvals/approvals";
import { useApprovals } from "@/components/business/approvals/useApprovals";

export default function ApprovalsPage() {
  const { user, isLoaded } = useCurrentUser();
  const router = useRouter();
  const { language } = useLanguage();
  const approvals = useApprovals(language);
  const { pending, history, hasLoaded, actionLoading } = approvals;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [approvalAction, setApprovalAction] = useState<ApprovalAction>('approve');
  const [approvalComment, setApprovalComment] = useState('');

  const t = useCallback(
    (key: DashboardTranslationKeys): string => {
      const langTranslations = dashboardTranslations[language] || dashboardTranslations.en;
      return langTranslations[key as keyof typeof langTranslations] || key;
    },
    [language]
  );

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
    }
  }, [isLoaded, user, router]);

  const openApprovalDialog = (approval: ApprovalRequest, action: ApprovalAction) => {
    setSelectedApproval(approval);
    setApprovalAction(action);
    setApprovalComment('');
    setIsDialogOpen(true);
  };

  const submitDecision = () => {
    if (!selectedApproval) return;
    approvals.decide(selectedApproval, approvalAction, approvalComment, () => {
      setIsDialogOpen(false);
      setApprovalComment('');
      setSelectedApproval(null);
    });
  };

  if (!hasLoaded) {
    return (
      <main className={`${APP_CONTAINER} space-y-6 py-8`} aria-busy="true">
        <SkeletonPageHeader />
        <SkeletonCardList />
      </main>
    );
  }

  if (approvals.error) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Alert variant="destructive">
          <AlertDescription>{approvals.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const listProps = { hasLoaded, language, t, actionLoading, onDecide: openApprovalDialog };

  return (
    <div className="min-h-screen    ">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="space-y-6">
          <WindowStatusBar>
            {language === "zh"
              ? `${pending.totalItems} 项待审批 · ${history.totalItems} 项已处理`
              : `${pending.totalItems} pending · ${history.totalItems} decided`}
          </WindowStatusBar>
          <PageHeader title={t('approvalsTitle')} description={t('approvalsDescription')} />

          <Tabs value={approvals.activeTab} onValueChange={approvals.setActiveTab} className="gap-0">
            <TabsList>
              <TabsTrigger value="pending">
                {t('pendingApprovals')}
                <span className="text-muted-foreground tabular-nums">{hasLoaded ? pending.totalItems : "–"}</span>
              </TabsTrigger>
              <TabsTrigger value="history">
                {t('approvalHistory')}
                <span className="text-muted-foreground tabular-nums">{hasLoaded ? history.totalItems : "–"}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-6 space-y-4">
              <ApprovalList
                list={pending}
                emptyTitle={t('noPendingApprovals')}
                emptyHint={language === "zh" ? "所有审批申请都已处理" : "Every request has been handled."}
                {...listProps}
              />
            </TabsContent>

            <TabsContent value="history" className="mt-6 space-y-4">
              <ApprovalList
                list={history}
                emptyTitle={t('noApprovalHistory')}
                emptyHint={language === "zh" ? "审批过的申请会显示在这里" : "Approved and rejected requests show up here."}
                {...listProps}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ApprovalDecisionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        approval={selectedApproval}
        action={approvalAction}
        comment={approvalComment}
        onCommentChange={setApprovalComment}
        submitting={actionLoading === selectedApproval?.id}
        onSubmit={submitDecision}
        language={language}
        t={t}
      />
    </div>
  );
}
