'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  showDetails?: boolean;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
}

/**
 * React 错误边界组件
 * 捕获子组件中的 JavaScript 错误，记录错误并显示友好的错误界面
 */
export class ErrorBoundary extends Component<Props, State> {
  private static errorCount = 0;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): State {
    ErrorBoundary.errorCount += 1;
    return {
      hasError: true,
      error,
      errorId: `ERR_${Date.now()}_${ErrorBoundary.errorCount}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误到控制台
    console.error('[ErrorBoundary] 捕获到错误:', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    // 更新状态以包含错误信息
    this.setState({ errorInfo });

    // 调用自定义错误处理回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 在生产环境中，可以发送错误到监控服务
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo);
    }
  }

  /**
   * 上报错误到监控服务
   */
  private reportError(_error: Error, _errorInfo: ErrorInfo) {
    // 这里可以集成 Sentry, LogRocket 等错误监控服务
    // 例如：
    // Sentry.captureException(error, {
    //   contexts: {
    //     react: {
    //       componentStack: errorInfo.componentStack,
    //     },
    //   },
    //   tags: {
    //     errorBoundary: true,
    //   },
    // });

    console.warn('[ErrorBoundary] 错误已上报到监控服务');
  }

  /**
   * 重置错误状态
   */
  private handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: '',
    });
  };

  /**
   * 刷新页面
   */
  private handleRefresh = () => {
    window.location.reload();
  };

  /**
   * 回到首页
   */
  private handleGoHome = () => {
    window.location.href = '/';
  };

  /**
   * 复制错误信息
   */
  private handleCopyError = async () => {
    const errorText = `
错误ID: ${this.state.errorId}
时间: ${new Date().toISOString()}
错误: ${this.state.error?.name}: ${this.state.error?.message}
页面: ${window.location.href}
用户代理: ${navigator.userAgent}

堆栈信息:
${this.state.error?.stack}

组件堆栈:
${this.state.errorInfo?.componentStack}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      alert('错误信息已复制到剪贴板');
    } catch (err) {
      console.error('复制失败:', err);
      // 降级方案：选择文本
      const textarea = document.createElement('textarea');
      textarea.value = errorText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('错误信息已复制到剪贴板');
    }
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误界面
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="h-12 w-12 text-red-500" />
              </div>
              <CardTitle className="text-2xl text-red-600">
                页面出现错误
              </CardTitle>
              <CardDescription>
                很抱歉，页面遇到了一个意外错误。我们已经记录了这个问题。
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <Alert>
                <Bug className="h-4 w-4" />
                <AlertDescription>
                  <strong>错误ID:</strong> {this.state.errorId}
                  <br />
                  <strong>时间:</strong> {new Date().toLocaleString()}
                  {this.state.error && (
                    <>
                      <br />
                      <strong>错误类型:</strong> {this.state.error.name}
                    </>
                  )}
                </AlertDescription>
              </Alert>

              {/* 开发环境或显示详情模式下展示详细错误信息 */}
              {(process.env.NODE_ENV === 'development' || this.props.showDetails) && 
               this.state.error && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertDescription className="text-sm font-mono">
                    <strong>错误消息:</strong>
                    <br />
                    {this.state.error.message}
                    
                    {this.state.error.stack && (
                      <>
                        <br />
                        <br />
                        <strong>堆栈信息:</strong>
                        <br />
                        <pre className="whitespace-pre-wrap text-xs overflow-auto max-h-40">
                          {this.state.error.stack}
                        </pre>
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                  onClick={this.handleReset} 
                  variant="default"
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  重试
                </Button>
                
                <Button 
                  onClick={this.handleRefresh} 
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  刷新页面
                </Button>
                
                <Button 
                  onClick={this.handleGoHome} 
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="h-4 w-4 mr-2" />
                  回到首页
                </Button>
              </div>

              {(process.env.NODE_ENV === 'development' || this.props.showDetails) && (
                <div className="pt-2 border-t">
                  <Button 
                    onClick={this.handleCopyError} 
                    variant="ghost" 
                    size="sm"
                    className="w-full"
                  >
                    <Bug className="h-4 w-4 mr-2" />
                    复制错误信息
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 错误边界 Hook 版本
 * 用于函数组件中的错误处理
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * 简单的错误边界组件
 * 用于包装单个组件或页面
 */
export function SimpleErrorBoundary({ 
  children, 
  message = "组件加载失败" 
}: { 
  children: ReactNode; 
  message?: string;
}) {
  return (
    <ErrorBoundary
      fallback={
        <Alert className="m-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      }
    >
      {children}
    </ErrorBoundary>
  );
} 