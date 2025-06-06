import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/components/LanguageProvider";
import CSSErrorHandler from "@/components/CSSErrorHandler";
import ParticleBackground from '@/components/effects/ParticleBackground';

const inter = Inter({ subsets: ["latin"] });

// Keep metadata export here (Server Component)
export const metadata: Metadata = {
  title: "SQL Script Deployment & Monitoring System",
  description: "Manage and monitor SQL script execution status",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 在构建时，如果没有Clerk密钥，则不包装ClerkProvider
  const hasClerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const content = (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* 添加CSS预加载提示，减少404错误 */}
        <meta name="preload" content="styles" />
      </head>
      <body className={inter.className}>
        <ParticleBackground />
        <CSSErrorHandler />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );

  if (!hasClerkKey) {
    return content;
  }

  return <ClerkProvider>{content}</ClerkProvider>;
}