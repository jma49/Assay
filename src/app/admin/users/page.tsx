'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, Shield, Users, Crown, Code, Eye, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { UserRole } from '@/lib/types/approval';
import { useLanguage } from '@/components/LanguageProvider';
import { dashboardTranslations, DashboardTranslationKeys } from '@/components/dashboard/types';
import UserHeader from '@/components/UserHeader';

// 角色信息映射
const getRoleInfo = (role: UserRole, t: (key: DashboardTranslationKeys) => string) => ({
  [UserRole.ADMIN]: {
    label: t('adminRole'),
    description: t('adminDesc'),
    icon: Crown,
    color: 'bg-red-100 text-red-800 border-red-200'
  },
  [UserRole.MANAGER]: {
    label: t('managerRole'),
    description: t('managerDesc'),
    icon: Shield,
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  [UserRole.DEVELOPER]: {
    label: t('developerRole'),
    description: t('developerDesc'),
    icon: Code,
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  [UserRole.VIEWER]: {
    label: t('viewerRole'),
    description: t('viewerDesc'),
    icon: Eye,
    color: 'bg-gray-100 text-gray-800 border-gray-200'
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
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.DEVELOPER);
  const [error, setError] = useState<string | null>(null);

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

  // 检查当前用户权限
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
      return;
    }
  }, [isLoaded, user, router]);

  // 加载用户角色列表
  const loadUserRoles = async () => {
    try {
      setLoading(true);
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
      toast.error('加载用户角色列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && user) {
      loadUserRoles();
    }
  }, [isLoaded, user]);

  // 分配用户角色
  const assignRole = async () => {
    if (!newUserId || !newUserEmail || !selectedRole) {
      toast.error('请填写所有字段');
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

      toast.success(`用户 ${newUserEmail} 的角色已设置为 ${getRoleInfo(selectedRole, t).label}`);
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

      toast.success(`用户 ${email} 的角色已删除`);
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

      toast.success(`用户 ${email} 的角色已修改为 ${getRoleInfo(newRole, t).label}`);
      loadUserRoles(); // 重新加载列表
    } catch (error) {
      console.error('修改角色失败:', error);
      toast.error(error instanceof Error ? error.message : '修改角色失败');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
        <UserHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="flex items-center justify-center py-12 text-muted-foreground space-x-3">
            <Loader2 className="animate-spin h-6 w-6 text-primary" />
            <span className="text-lg font-medium">{t("loading")}</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
        <UserHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <Alert className="border-destructive bg-destructive/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-destructive">{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

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
                  {t('userManagementTitle')}
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t('userManagementDesc')}
                </p>
              </div>
              
              {/* Add Role Dialog Trigger */}
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="group shadow-md hover:shadow-lg transition-all duration-300">
                    <UserPlus className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                    {t('assignRole') || '分配角色'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('addUserRole')}</DialogTitle>
                    <DialogDescription>
                      {t('userManagementDesc')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="userId">{t('userIdField') || '用户ID'}</Label>
                      <Input
                        id="userId"
                        value={newUserId}
                        onChange={(e) => setNewUserId(e.target.value)}
                        placeholder="例如: user_2xxHZleOgAOksfDrizwQ1W1xJnA"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">{t('userEmail')}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="例如: user@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">{t('selectRole') || '角色'}</Label>
                      <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ROLE_INFO).map(([role, info]) => (
                            <SelectItem key={role} value={role}>
                              <div className="flex items-center space-x-2">
                                <info.icon className="h-4 w-4" />
                                <span>{info.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      {t('cancel')}
                    </Button>
                    <Button onClick={assignRole} disabled={actionLoading === 'assign'}>
                      {actionLoading === 'assign' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {t('assignRole')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </header>

          {/* Role Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(ROLE_INFO).map(([role, info]) => {
              const count = userRoles.filter(u => u.role === role).length;
              const Icon = info.icon;
              
              return (
                <Card key={role} className="group relative overflow-hidden border-2 border-border/20 bg-gradient-to-br from-card via-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:border-border/40">
                  {/* 装饰性背景 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
                  <CardContent className="relative p-6">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl ring-2 transition-all duration-300 ${info.color} group-hover:scale-110`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{info.label}</p>
                        <p className="text-3xl font-bold text-foreground">{count}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* User Roles List */}
          <Card className="group relative overflow-hidden border-2 border-border/20 bg-gradient-to-br from-card via-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:border-border/40">
            {/* 装饰性背景 */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
            
            <CardHeader className="relative px-6 py-5 border-b border-border/30 bg-gradient-to-r from-muted/20 to-muted/10">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10 ring-2 ring-blue-500/20 group-hover:ring-blue-500/30 transition-all duration-300">
                  <Users className="h-6 w-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-bold text-foreground leading-relaxed">
                    {t('userList') || '用户列表'} ({userRoles.length})
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {t('userManagementDesc')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative p-6">
              {userRoles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium">{t('noDataFound') || '暂无用户角色数据'}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userRoles.map((userRole) => {
                    const roleInfo = ROLE_INFO[userRole.role];
                    const Icon = roleInfo.icon;
                    
                    return (
                      <div
                        key={userRole.userId}
                        className="group/row flex items-center justify-between p-4 border border-border/20 rounded-lg bg-gradient-to-r from-background to-muted/5 hover:from-muted/10 hover:to-muted/20 transition-all duration-200 hover:shadow-sm"
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`p-2 rounded-full transition-all duration-200 ${roleInfo.color} group-hover/row:scale-105`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-foreground group-hover/row:text-primary transition-colors duration-200">
                              {userRole.email}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ID: {userRole.userId}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {t('assignedAt') || '分配时间'}: {new Date(userRole.assignedAt).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}
                              {userRole.assignedBy && ` | ${t('assignedBy') || '分配者'}: ${userRole.assignedBy}`}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className={`transition-all duration-200 ${roleInfo.color}`}>
                            {roleInfo.label}
                          </Badge>
                          
                          <Select
                            value={userRole.role}
                            onValueChange={(newRole) => changeRole(userRole.userId, userRole.email, newRole as UserRole)}
                            disabled={actionLoading === userRole.userId}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(ROLE_INFO).map(([role, info]) => (
                                <SelectItem key={role} value={role}>
                                  <div className="flex items-center space-x-2">
                                    <info.icon className="h-4 w-4" />
                                    <span>{info.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeRole(userRole.userId, userRole.email)}
                            disabled={actionLoading === userRole.userId || userRole.userId === user?.id}
                            className="transition-all duration-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700 dark:hover:bg-red-950/20"
                          >
                            {actionLoading === userRole.userId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              t('removeRole') || '删除'
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
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
    </div>
  );
} 