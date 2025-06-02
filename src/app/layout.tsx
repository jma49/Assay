import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from '@/components/LanguageProvider';

const inter = Inter({ subsets: ["latin"] });

// Keep metadata export here (Server Component)
export const metadata: Metadata = {
  title: "SQL脚本部署与监控系统",
  description: "管理和监控SQL脚本的执行状态",
};

// 客户端脚本用于处理CSS加载错误
const cssErrorHandler = `
  // 处理开发模式下的CSS 404错误
  if (typeof window !== 'undefined') {
    // 检查是否为开发模式（localhost或包含dev的URL）
    const isDev = window.location.hostname === 'localhost' || 
                  window.location.hostname.includes('dev') ||
                  window.location.port === '3000';
    
    if (isDev) {
      window.addEventListener('error', function(e) {
        if (e.target && e.target.tagName === 'LINK' && e.target.rel === 'stylesheet') {
          console.warn('CSS文件加载失败，这在开发模式下是正常的:', e.target.href);
          e.preventDefault();
          return false;
        }
      }, true);
      
      // 处理网络错误
      window.addEventListener('unhandledrejection', function(e) {
        if (e.reason && e.reason.message && e.reason.message.includes('css')) {
          console.warn('CSS相关的Promise被拒绝，这在开发模式下是正常的:', e.reason);
          e.preventDefault();
        }
      });
    }
  }
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 在构建时，如果没有Clerk密钥，则不包装ClerkProvider
  const hasClerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const content = (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: cssErrorHandler }} />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );

  if (!hasClerkKey) {
    return content;
  }

  return (
    <ClerkProvider>
      {content}
    </ClerkProvider>
  );
}