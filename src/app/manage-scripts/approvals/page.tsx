'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Clock, AlertTriangle, FileText, User, Calendar, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { ApprovalStatus, ScriptType, ApprovalRequestDto } from '@/lib/types/approval';
import { useLanguage } from '@/components/LanguageProvider';
import { dashboardTranslations, DashboardTranslationKeys, ITEMS_PER_PAGE } from '@/components/dashboard/types';
import UserHeader from '@/components/UserHeader';

// 状态信息映射
const getStatusInfo = (status: ApprovalStatus, t: (key: DashboardTranslationKeys) => string) => ({
  [ApprovalStatus.PENDING]: {
    label: t('pending'),
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  [ApprovalStatus.APPROVED]: {
    label: t('approved'),
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  [ApprovalStatus.REJECTED]: {
    label: t('rejected'),
    icon: XCircle,
    color: 'bg-red-100 text-red-800 border-red-200'
  },
  [ApprovalStatus.WITHDRAWN]: {
    label: t('withdrawn'),
    icon: AlertTriangle,
    color: 'bg-gray-100 text-gray-800 border-gray-200'
  },
  [ApprovalStatus.DRAFT]: {
    label: t('draft'),
    icon: FileText,
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  }
}[status]);

// 脚本类型信息映射
const getScriptTypeInfo = (scriptType: ScriptType, t: (key: DashboardTranslationKeys) => string) => ({
  [ScriptType.READ_ONLY]: {
    label: t('readOnlyQuery'),
    description: t('readOnlyDesc'),
    color: 'bg-green-100 text-green-800'
  },
  [ScriptType.DATA_MODIFICATION]: {
    label: t('dataModification'),
    description: t('dataModificationDesc'),
    color: 'bg-yellow-100 text-yellow-800'
  },
  [ScriptType.STRUCTURE_CHANGE]: {
    label: t('structureChange'),
    description: t('structureChangeDesc'),
    color: 'bg-orange-100 text-orange-800'
  },
  [ScriptType.SYSTEM_ADMIN]: {
    label: t('systemAdmin'),
    description: t('systemAdminDesc'),
    color: 'bg-red-100 text-red-800'
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
      toast.error('加载待审批列表失败');
    }
  }, []);

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
      toast.error('加载审批历史失败');
    }
  }, []);

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      await Promise.all([loadPendingApprovals(), loadApprovalHistory(currentPageHistory)]);
      setError(null);
    } catch (error) {
      console.error('加载数据失败:', error);
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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">{t('loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const ApprovalCard = ({ approval }: { approval: ApprovalRequest }) => {
    const statusInfo = getStatusInfo(approval.status, t);
    const typeInfo = getScriptTypeInfo(approval.scriptType, t);
    const StatusIcon = statusInfo.icon;

    return (
      <Card className="mb-4">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-lg font-semibold">{approval.scriptName}</h3>
                <Badge variant="outline" className={statusInfo.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusInfo.label}
                </Badge>
                <Badge variant="outline" className={typeInfo.color}>
                  {typeInfo.label}
                </Badge>
              </div>
              
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>{t('requestor')}: {approval.requesterEmail}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>{t('createdAt')}: {new Date(approval.createdAt).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>{t('scriptId')}: {approval.scriptId}</span>
                </div>
              </div>

              {approval.reason && (
                <div className="mt-3 p-3 bg-muted rounded-md">
                  <div className="text-sm font-medium mb-1">{t('requestReason')}:</div>
                  <div className="text-sm">{approval.reason}</div>
                </div>
              )}

              {approval.currentApprovers.length > 0 && (
                <div className="mt-3">
                  <div className="text-sm font-medium mb-2">{t('approvalRecord')}:</div>
                  <div className="space-y-2">
                    {approval.currentApprovers.map((approver, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm">
                        <Badge 
                          variant="outline" 
                          className={approver.decision === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                        >
                          {approver.decision === 'approved' ? t('approved') : t('rejected')}
                        </Badge>
                        <span>{approver.email}</span>
                        <span className="text-muted-foreground">
                          {new Date(approver.timestamp).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}
                        </span>
                        {approver.comment && (
                          <span className="text-muted-foreground">- {approver.comment}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {approval.status === ApprovalStatus.PENDING && (
              <div className="flex space-x-2 ml-4">
                <Button
                  size="sm"
                  onClick={() => openApprovalDialog(approval, 'approve')}
                  disabled={actionLoading === approval.id}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {t('approve')}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => openApprovalDialog(approval, 'reject')}
                  disabled={actionLoading === approval.id}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  {t('reject')}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
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
            className="h-7 px-2 text-xs shadow-sm hover:shadow transition-all duration-150"
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
            className="h-7 px-2 text-xs shadow-sm hover:shadow transition-all duration-150"
          >
            <span className="hidden sm:inline">{t("next")}</span>
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </CardFooter>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
      <UserHeader />
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="space-y-8">
          <header className="text-center lg:text-left">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent leading-tight py-1">
              {t('approvalsTitle')}
            </h1>
            <p className="text-lg text-muted-foreground mt-3">
              {t('approvalsDescription')}
            </p>
          </header>

          <Card className="group relative overflow-hidden border-2 border-border/20 bg-gradient-to-br from-card via-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:border-border/40">
            {/* 装饰性背景 */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 opacity-50 group-hover:opacity-70 transition-opacity duration-500 pointer-events-none" />
            
            <CardContent className="relative p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 rounded-xl p-1 border border-border/30">
                  <TabsTrigger 
                    value="pending"
                    className="relative rounded-lg font-medium transition-all duration-300 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-border/50"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{t('pendingApprovals')}</span>
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {totalPendingApprovals}
                      </Badge>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="history"
                    className="relative rounded-lg font-medium transition-all duration-300 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-border/50"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>{t('approvalHistory')}</span>
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {totalHistoryApprovals}
                      </Badge>
                    </div>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="space-y-6 mt-0">
                  <div className="space-y-4">
                    {paginatedPendingApprovals.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border-2 border-dashed border-muted-foreground/20 max-w-md mx-auto">
                          <Clock className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                          <p className="text-lg font-medium text-muted-foreground mb-2">{t('noPendingApprovals')}</p>
                          <p className="text-sm text-muted-foreground/70">所有审批申请已处理完毕</p>
                        </div>
                      </div>
                    ) : (
                      paginatedPendingApprovals.map((approval) => (
                        <ApprovalCard key={approval.id} approval={approval} />
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="history" className="space-y-6 mt-0">
                  <div className="space-y-4">
                    {paginatedHistoryApprovals.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border-2 border-dashed border-muted-foreground/20 max-w-md mx-auto">
                          <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                          <p className="text-lg font-medium text-muted-foreground mb-2">{t('noApprovalHistory')}</p>
                          <p className="text-sm text-muted-foreground/70">暂无审批历史记录</p>
                        </div>
                      </div>
                    ) : (
                      paginatedHistoryApprovals.map((approval) => (
                        <ApprovalCard key={approval.id} approval={approval} />
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>

            {/* 分页 - 根据当前活跃的Tab显示 */}
            {activeTab === 'pending' && renderPagination(
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

            {activeTab === 'history' && renderPagination(
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
          </Card>
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
              {selectedApproval && `脚本: ${selectedApproval.scriptName} (${selectedApproval.scriptId})`}
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
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
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