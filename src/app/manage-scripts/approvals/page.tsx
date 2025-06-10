'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Clock, AlertTriangle, FileText, User, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { ApprovalStatus, ScriptType, ApprovalRequestDto } from '@/lib/types/approval';
import { useLanguage } from '@/components/LanguageProvider';
import { dashboardTranslations, DashboardTranslationKeys } from '@/components/dashboard/types';
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

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

  // 翻译函数
  const t = useCallback(
    (key: DashboardTranslationKeys): string => {
      const langTranslations = dashboardTranslations[language] || dashboardTranslations.en;
      return langTranslations[key as keyof typeof langTranslations] || key;
    },
    [language]
  );

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
  const loadApprovalHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/approvals?action=history');
      
      if (!response.ok) {
        throw new Error('获取审批历史失败');
      }

      const data = await response.json();
      setApprovalHistory(data.data || []);
    } catch (error) {
      console.error('加载审批历史失败:', error);
      toast.error('加载审批历史失败');
    }
  }, []);

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      await Promise.all([loadPendingApprovals(), loadApprovalHistory()]);
      setError(null);
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  }, [loadPendingApprovals, loadApprovalHistory]);

  useEffect(() => {
    if (isLoaded && user) {
      loadData();
    }
  }, [isLoaded, user, loadData]);

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
          approvalId: selectedApproval.id,
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
      loadData(); // 重新加载数据
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
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {t('approve')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openApprovalDialog(approval, 'reject')}
                  disabled={actionLoading === approval.id}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  {t('reject')}
                </Button>
              </div>
            )}
          </div>

          <div className="border-t pt-3">
            <div className="text-xs text-muted-foreground">
              {t('requiredRoles')}: {approval.requiredApprovers.join(', ')} | 
              {t('progress')}: {approval.currentApprovers.length}/{approval.requiredApprovers.length} |
              {approval.isComplete ? ` ${t('approvalComplete')}` : ` ${t('pendingApproval')}`}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
      <UserHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="space-y-8 animate-fadeIn">
          {/* Header Section */}
          <header className="text-center lg:text-left">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="space-y-3">
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent leading-tight py-1">
                  {t('approvalsTitle')}
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t('approvalsDescription')}
                </p>
              </div>
            </div>
          </header>

          {/* Error Display */}
          {error && (
            <Alert className="border-destructive bg-destructive/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-destructive">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Main Content */}
          {(
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-2">
                <TabsTrigger value="pending" className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>{t('pendingApprovals')} ({pendingApprovals.length})</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>{t('approvalHistory')} ({approvalHistory.length})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending">
                <Card className="group relative overflow-hidden border-2 border-border/20 bg-gradient-to-br from-card via-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:border-border/40">
                  {/* 装饰性背景 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
                  
                  <CardHeader className="relative px-6 py-5 border-b border-border/30 bg-gradient-to-r from-muted/20 to-muted/10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-yellow-500/10 ring-2 ring-yellow-500/20 group-hover:ring-yellow-500/30 transition-all duration-300">
                        <Clock className="h-6 w-6 text-yellow-600 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <div className="space-y-2">
                        <CardTitle className="text-2xl font-bold text-foreground leading-relaxed">
                          {t('pendingScripts')}
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                          {t('pendingScriptsDesc')}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative p-6">
                    {pendingApprovals.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-lg font-medium">{t('noPendingApprovals')}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {pendingApprovals.map((approval) => (
                          <ApprovalCard key={approval.id} approval={approval} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history">
                <Card className="group relative overflow-hidden border-2 border-border/20 bg-gradient-to-br from-card via-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:border-border/40">
                  {/* 装饰性背景 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
                  
                  <CardHeader className="relative px-6 py-5 border-b border-border/30 bg-gradient-to-r from-muted/20 to-muted/10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-blue-500/10 ring-2 ring-blue-500/20 group-hover:ring-blue-500/30 transition-all duration-300">
                        <FileText className="h-6 w-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <div className="space-y-2">
                        <CardTitle className="text-2xl font-bold text-foreground leading-relaxed">
                          {t('historyScripts')}
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                          {t('historyScriptsDesc')}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative p-6">
                    {approvalHistory.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-lg font-medium">{t('noApprovalHistory')}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {approvalHistory.map((approval) => (
                          <ApprovalCard key={approval.id} approval={approval} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* 版本号显示 - 固定在左下角 */}
      <div className="fixed left-6 bottom-6 z-50">
        <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="font-mono text-xs text-muted-foreground font-medium">
            v{process.env.NEXT_PUBLIC_APP_VERSION || "0.4.0"}
          </span>
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
              {t('scriptType')}: {selectedApproval?.scriptName}
            </DialogDescription>
          </DialogHeader>
          
          {selectedApproval && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-md">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">{t('requestor')}:</span> {selectedApproval.requesterEmail}
                  </div>
                  <div>
                    <span className="font-medium">{t('scriptType')}:</span> {getScriptTypeInfo(selectedApproval.scriptType, t).label}
                  </div>
                  <div>
                    <span className="font-medium">{t('createdAt')}:</span> {new Date(selectedApproval.createdAt).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}
                  </div>
                  <div>
                    <span className="font-medium">{t('scriptId')}:</span> {selectedApproval.scriptId}
                  </div>
                </div>
                {selectedApproval.reason && (
                  <div className="mt-3">
                    <div className="font-medium text-sm mb-1">{t('requestReason')}:</div>
                    <div className="text-sm">{selectedApproval.reason}</div>
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="comment">
                  {t('approvalReason')}
                </Label>
                <Textarea
                  id="comment"
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  placeholder={approvalAction === 'approve' ? t('approvalReasonPlaceholder') : t('rejectReasonPlaceholder')}
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleApproval}
              disabled={actionLoading === selectedApproval?.id}
              variant={approvalAction === 'approve' ? 'default' : 'destructive'}
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