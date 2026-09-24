'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Clock, AlertTriangle, FileText, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { ApprovalStatus, ScriptType, ApprovalRequestDto } from "@/lib/types/approval";
import { useLanguage } from '@/components/common/LanguageProvider';
import { dashboardTranslations, DashboardTranslationKeys, ITEMS_PER_PAGE } from '@/components/business/dashboard/types';
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCardList, SkeletonPageHeader } from "@/components/common/PageSkeletons";
import { APP_CONTAINER } from "@/components/layout/app-container";

// 状态信息映射
const getStatusInfo = (status: ApprovalStatus, t: (key: DashboardTranslationKeys) => string) => ({
  [ApprovalStatus.PENDING]: {
    label: t('pending'),
    icon: Clock,
    color: 'bg-attention/10 text-attention border-attention/30'
  },
  [ApprovalStatus.APPROVED]: {
    label: t('approved'),
    icon: CheckCircle,
    color: 'bg-success/10 text-success border-success/30'
  },
  [ApprovalStatus.REJECTED]: {
    label: t('rejected'),
    icon: XCircle,
    color: 'bg-failure/10 text-failure border-failure/30'
  },
  [ApprovalStatus.WITHDRAWN]: {
    label: t('withdrawn'),
    icon: AlertTriangle,
    color: 'bg-muted text-foreground border-border'
  },
  [ApprovalStatus.DRAFT]: {
    label: t('draft'),
    icon: FileText,
    color: 'bg-muted text-foreground border-border'
  }
}[status]);

// 脚本类型信息映射
const getScriptTypeInfo = (scriptType: ScriptType, t: (key: DashboardTranslationKeys) => string) => ({
  [ScriptType.READ_ONLY]: {
    label: t('readOnlyQuery'),
    description: t('readOnlyDesc'),
    color: 'bg-success/10 text-success'
  },
  [ScriptType.DATA_MODIFICATION]: {
    label: t('dataModification'),
    description: t('dataModificationDesc'),
    color: 'bg-attention/10 text-attention'
  },
  [ScriptType.STRUCTURE_CHANGE]: {
    label: t('structureChange'),
    description: t('structureChangeDesc'),
    color: 'bg-attention/10 text-attention'
  },
  [ScriptType.SYSTEM_ADMIN]: {
    label: t('systemAdmin'),
    description: t('systemAdminDesc'),
    color: 'bg-failure/10 text-failure'
  }
}[scriptType]);

// 使用共享的类型定义
type ApprovalRequest = ApprovalRequestDto;

export default function ApprovalsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { language } = useLanguage();
  
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // 分页相关状态
  const [currentPagePending, setCurrentPagePending] = useState(1);
  const [currentPageHistory, setCurrentPageHistory] = useState(1);
  const [pageInputPending, setPageInputPending] = useState("");
  const [pageInputHistory, setPageInputHistory] = useState("");
  
  // 审批历史分页信息
  const [totalHistoryPages, setTotalHistoryPages] = useState(1);
  const [totalHistoryCount, setTotalHistoryCount] = useState(0);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // Until the first load finishes, show placeholders rather than "nothing pending".
  const [hasLoaded, setHasLoaded] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComment, setApprovalComment] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

  // 翻译函数
  const t = useCallback(
    (key: DashboardTranslationKeys): string => {
      const langTranslations = dashboardTranslations[language] || dashboardTranslations.en;
      return langTranslations[key as keyof typeof langTranslations] || key;
    },
    [language]
  );

  // 分页逻辑 - 待审批
  const totalPendingApprovals = pendingApprovals.length;
  const totalPagesPending = Math.ceil(totalPendingApprovals / ITEMS_PER_PAGE);
  const startIndexPending = (currentPagePending - 1) * ITEMS_PER_PAGE;
  const endIndexPending = startIndexPending + ITEMS_PER_PAGE;
  const paginatedPendingApprovals = pendingApprovals.slice(startIndexPending, endIndexPending);

  // 分页逻辑 - 历史记录（使用服务端分页）
  const totalHistoryApprovals = totalHistoryCount;
  const totalPagesHistory = totalHistoryPages;
  const startIndexHistory = (currentPageHistory - 1) * ITEMS_PER_PAGE;
  const endIndexHistory = startIndexHistory + ITEMS_PER_PAGE;
  const paginatedHistoryApprovals = approvalHistory; // 服务端已经分页了，直接使用

  // 分页相关函数 - 待审批
  const handlePageInputChangePending = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInputPending(e.target.value);
  };

  const handlePageInputSubmitPending = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInputPending, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPagesPending) {
      setCurrentPagePending(page);
      setPageInputPending("");
    }
  };

  const handlePageInputKeyDownPending = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handlePageInputSubmitPending(e);
    }
    if (
      !/[\d\b]/.test(e.key) &&
      !["ArrowLeft", "ArrowRight", "Delete", "Backspace", "Tab"].includes(e.key)
    ) {
      e.preventDefault();
    }
  };

  // 分页相关函数 - 历史记录
  const handlePageInputChangeHistory = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInputHistory(e.target.value);
  };

  const handlePageInputSubmitHistory = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInputHistory, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPagesHistory) {
      setCurrentPageHistory(page);
      setPageInputHistory("");
    }
  };

  const handlePageInputKeyDownHistory = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handlePageInputSubmitHistory(e);
    }
    if (
      !/[\d\b]/.test(e.key) &&
      !["ArrowLeft", "ArrowRight", "Delete", "Backspace", "Tab"].includes(e.key)
    ) {
      e.preventDefault();
    }
  };

  // 格式化分页信息
  const formatPageInfoPending = () => {
    const start = startIndexPending + 1;
    const end = Math.min(endIndexPending, totalPendingApprovals);
    return t("pageInfo")
      .replace("%s", String(start))
      .replace("%s", String(end))
      .replace("%s", String(totalPendingApprovals))
      .replace("%s", String(currentPagePending))
      .replace("%s", String(totalPagesPending));
  };

  const formatPageInfoHistory = () => {
    const start = startIndexHistory + 1;
    const end = Math.min(endIndexHistory, totalHistoryApprovals);
    return t("pageInfo")
      .replace("%s", String(start))
      .replace("%s", String(end))
      .replace("%s", String(totalHistoryApprovals))
      .replace("%s", String(currentPageHistory))
      .replace("%s", String(totalPagesHistory));
  };

  // 检查当前用户权限
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
      return;
    }
  }, [isLoaded, user, router]);

  // 加载待审批列表
  const loadPendingApprovals = useCallback(async () => {
    try {
      const response = await fetch('/api/approvals?action=pending');
      
      if (!response.ok) {
        if (response.status === 403) {
          setError('权限不足：无法查看审批列表');
          return;
        }
        throw new Error('获取待审批列表失败');
      }

      const data = await response.json();
      setPendingApprovals(data.data || []);
    } catch (error) {
      console.error('加载待审批列表失败:', error);
      toast.error(language === "zh" ? "加载待审批列表失败" : "Could not load pending approvals");
    }
  }, [language]);

  // 加载审批历史
  const loadApprovalHistory = useCallback(async (page: number = 1) => {
    try {
      const response = await fetch(`/api/approvals?action=history&page=${page}&limit=${ITEMS_PER_PAGE}`);
      
      if (!response.ok) {
        throw new Error('获取审批历史失败');
      }

      const data = await response.json();
      setApprovalHistory(data.data || []);
      
      // 设置分页信息
      if (data.pagination) {
        setTotalHistoryPages(data.pagination.totalPages || 1);
        setTotalHistoryCount(data.pagination.total || 0);
      }
    } catch (error) {
      console.error('加载审批历史失败:', error);
      toast.error(language === "zh" ? "加载审批历史失败" : "Could not load approval history");
    }
  }, [language]);

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      await Promise.all([loadPendingApprovals(), loadApprovalHistory(currentPageHistory)]);
      setError(null);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setHasLoaded(true);
    }
  }, [loadPendingApprovals, loadApprovalHistory, currentPageHistory]);

  useEffect(() => {
    if (isLoaded && user) {
      loadData();
    }
  }, [isLoaded, user, loadData]);

  // 监听审批历史页面变化
  useEffect(() => {
    if (isLoaded && user && activeTab === 'history') {
      loadApprovalHistory(currentPageHistory);
    }
  }, [isLoaded, user, activeTab, currentPageHistory, loadApprovalHistory]);

  // 处理审批操作
  const handleApproval = async () => {
    if (!selectedApproval) return;

    try {
      setActionLoading(selectedApproval.id);
      
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: selectedApproval.id,
          action: approvalAction,
          comment: approvalComment.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '审批操作失败');
      }

      toast.success(
        approvalAction === 'approve' 
          ? `脚本 ${selectedApproval.scriptName} 已批准`
          : `脚本 ${selectedApproval.scriptName} 已拒绝`
      );

      setIsDialogOpen(false);
      setApprovalComment('');
      setSelectedApproval(null);
      // 重新加载数据，保持当前页面
      await Promise.all([loadPendingApprovals(), loadApprovalHistory(currentPageHistory)]);
    } catch (error) {
      console.error('审批操作失败:', error);
      toast.error(error instanceof Error ? error.message : '审批操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 打开审批对话框
  const openApprovalDialog = (approval: ApprovalRequest, action: 'approve' | 'reject') => {
    setSelectedApproval(approval);
    setApprovalAction(action);
    setApprovalComment('');
    setIsDialogOpen(true);
  };

  if (!isLoaded) {
    return (
      <main className={`${APP_CONTAINER} space-y-6 py-8`} aria-busy="true">
        <SkeletonPageHeader />
        <SkeletonCardList />
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

  const ApprovalCard = ({ approval }: { approval: ApprovalRequest }) => {
    const statusInfo = getStatusInfo(approval.status, t);
    const typeInfo = getScriptTypeInfo(approval.scriptType, t);
    const locale = language === 'zh' ? 'zh-CN' : 'en-US';
    const statusTone =
      approval.status === ApprovalStatus.APPROVED
        ? 'text-success'
        : approval.status === ApprovalStatus.REJECTED
          ? 'text-failure'
          : 'text-attention';

    return (
      <article className="rounded-lg border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-medium">{approval.scriptName}</h3>
              <Badge variant="secondary">{typeInfo.label}</Badge>
              <span className={`inline-flex items-center gap-1.5 text-[13px] ${statusTone}`}>
                <span className="size-1.5 rounded-full bg-current" aria-hidden />
                {statusInfo.label}
              </span>
            </div>
            <p className="text-[13px] text-muted-foreground">
              {approval.requesterEmail} · {new Date(approval.createdAt).toLocaleString(locale)} ·{' '}
              <span className="font-mono">{approval.scriptId}</span>
            </p>
          </div>

          {approval.status === ApprovalStatus.PENDING && (
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openApprovalDialog(approval, 'reject')}
                disabled={actionLoading === approval.id}
              >
                {t('reject')}
              </Button>
              <Button
                size="sm"
                onClick={() => openApprovalDialog(approval, 'approve')}
                disabled={actionLoading === approval.id}
              >
                {t('approve')}
              </Button>
            </div>
          )}
        </div>

        {approval.reason && (
          <blockquote className="mt-4 border-l-2 pl-3 text-sm text-muted-foreground">
            {approval.reason}
          </blockquote>
        )}

        {approval.currentApprovers.length > 0 && (
          <ul className="mt-4 space-y-1 border-t pt-3 text-[13px]">
            {approval.currentApprovers.map((approver, index) => (
              <li key={index} className="flex flex-wrap gap-x-2">
                <span className={approver.decision === 'approved' ? 'text-success' : 'text-failure'}>
                  {approver.decision === 'approved' ? t('approved') : t('rejected')}
                </span>
                <span>{approver.email}</span>
                <span className="text-muted-foreground">
                  {new Date(approver.timestamp).toLocaleString(locale)}
                </span>
                {approver.comment && <span className="text-muted-foreground">· {approver.comment}</span>}
              </li>
            ))}
          </ul>
        )}
      </article>
    );
  };

  // 渲染分页组件
  const renderPagination = (
    currentPage: number,
    totalPages: number,
    totalItems: number,
    pageInput: string,
    onPageChange: (page: number) => void,
    onPageInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    onPageInputSubmit: (e: React.FormEvent) => void,
    onPageInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void,
    formatPageInfo: () => string
  ) => {
    if (totalPages <= 1) return null;

    return (
      <CardFooter className="flex flex-col sm:flex-row items-center justify-between border-t px-5 py-3 text-xs gap-2">
        <div className="text-muted-foreground text-center sm:text-left">
          {formatPageInfo()}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className="h-7 px-2 text-xs transition-all duration-150"
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">{t("previous")}</span>
          </Button>

          <div className="flex items-center gap-1.5 px-2">
            <div className="hidden md:flex items-center gap-1">
              {currentPage > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPageChange(1)}
                  className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground"
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
                  onClick={() => onPageChange(totalPages)}
                  className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground"
                  title={t("jumpToLast")}
                >
                  {totalPages}
                </Button>
              )}
            </div>

            {totalPages > 2 && (
              <div className="hidden lg:flex items-center gap-1 ml-2">
                <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                <form
                  onSubmit={onPageInputSubmit}
                  className="flex items-center gap-1"
                >
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={pageInput}
                    onChange={onPageInputChange}
                    onKeyDown={onPageInputKeyDown}
                    placeholder={t("jumpToPage")}
                    className="w-12 h-6 px-1 text-xs text-center border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
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
                    className="h-6 px-2 text-xs"
                    title={t("pageJump")}
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
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="h-7 px-2 text-xs transition-all duration-150"
          >
            <span className="hidden sm:inline">{t("next")}</span>
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </CardFooter>
    );
  };

  return (
    <div className="min-h-screen    ">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="space-y-6">
          <PageHeader title={t('approvalsTitle')} description={t('approvalsDescription')} />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-0">
            <TabsList className="w-full">
              <TabsTrigger value="pending">
                {t('pendingApprovals')}
                <span className="text-muted-foreground tabular-nums">{hasLoaded ? totalPendingApprovals : "–"}</span>
              </TabsTrigger>
              <TabsTrigger value="history">
                {t('approvalHistory')}
                <span className="text-muted-foreground tabular-nums">{hasLoaded ? totalHistoryApprovals : "–"}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-6 space-y-4">
              {!hasLoaded ? (
                <SkeletonCardList count={2} />
              ) : paginatedPendingApprovals.length === 0 ? (
                <EmptyState
                  title={t('noPendingApprovals')}
                  hint={language === "zh" ? "所有审批申请都已处理" : "Every request has been handled."}
                />
              ) : (
                paginatedPendingApprovals.map((approval) => (
                  <ApprovalCard key={approval.id} approval={approval} />
                ))
              )}
              {renderPagination(
                currentPagePending,
                totalPagesPending,
                totalPendingApprovals,
                pageInputPending,
                setCurrentPagePending,
                handlePageInputChangePending,
                handlePageInputSubmitPending,
                handlePageInputKeyDownPending,
                formatPageInfoPending
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-6 space-y-4">
              {!hasLoaded ? (
                <SkeletonCardList count={2} />
              ) : paginatedHistoryApprovals.length === 0 ? (
                <EmptyState
                  title={t('noApprovalHistory')}
                  hint={language === "zh" ? "审批过的申请会显示在这里" : "Approved and rejected requests show up here."}
                />
              ) : (
                paginatedHistoryApprovals.map((approval) => (
                  <ApprovalCard key={approval.id} approval={approval} />
                ))
              )}
              {renderPagination(
                currentPageHistory,
                totalPagesHistory,
                totalHistoryApprovals,
                pageInputHistory,
                setCurrentPageHistory,
                handlePageInputChangeHistory,
                handlePageInputSubmitHistory,
                handlePageInputKeyDownHistory,
                formatPageInfoHistory
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 审批对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'approve' ? t('approveScript') : t('rejectScript')}
            </DialogTitle>
            <DialogDescription>
              {selectedApproval && `${language === "zh" ? "脚本" : "Script"}: ${selectedApproval.scriptName} (${selectedApproval.scriptId})`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                {approvalAction === 'approve' ? t('approvalReason') : t('rejectReasonPlaceholder')}
              </label>
              <Textarea
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder={
                  approvalAction === 'approve'
                    ? t('approvalReasonPlaceholder')
                    : t('rejectReasonPlaceholder')
                }
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleApproval}
              disabled={actionLoading === selectedApproval?.id}
              className={
                approvalAction === 'approve'
                  ? 'bg-success hover:bg-success'
                  : 'bg-failure hover:bg-failure'
              }
            >
              {actionLoading === selectedApproval?.id && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {approvalAction === 'approve' ? t('approve') : t('reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 