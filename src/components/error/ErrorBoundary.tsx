'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';

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
    console.error('[ErrorBoundary] Caught an error:', {
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

    this.setState({ errorInfo });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo);
    }
  }

  private reportError(error: Error, errorInfo: ErrorInfo) {
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack } },
      tags: { errorBoundary: true },
    });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: '',
    });
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    // A full load on purpose: after a render error the client state cannot be trusted.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = '/checks';
  };

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
      console.error('Copy failed:', err);
      // Fallback for browsers without the async Clipboard API.
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
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="h-12 w-12 text-failure" />
              </div>
              <CardTitle className="text-headline text-failure">
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

              {(process.env.NODE_ENV === 'development' || this.props.showDetails) && 
               this.state.error && (
                <Alert className="bg-failure/10 border-failure/30">
                  <AlertDescription className="text-body-md font-mono">
                    <strong>错误消息:</strong>
                    <br />
                    {this.state.error.message}
                    
                    {this.state.error.stack && (
                      <>
                        <br />
                        <br />
                        <strong>堆栈信息:</strong>
                        <br />
                        <pre className="whitespace-pre-wrap text-caption overflow-auto max-h-40">
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
