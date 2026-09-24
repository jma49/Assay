import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BRAND, BRAND_TAGLINE } from "@/lib/brand";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/themes";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/components/common/LanguageProvider";
import CSSErrorHandler from "@/components/error/CSSErrorHandler";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { GlobalErrorHandlerProvider } from "@/components/error/GlobalErrorHandlerProvider";
import { DialogPortalProvider } from "@/components/common/DialogPortalProvider";

const inter = Inter({ subsets: ["latin"] });

// Keep metadata export here (Server Component)
export const metadata: Metadata = {
  title: { default: BRAND, template: `%s · ${BRAND}` },
  description: BRAND_TAGLINE,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Builds run without Clerk keys, so the provider is optional here.
  const hasClerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const content = (
    <>
      <CSSErrorHandler />
      <GlobalErrorHandlerProvider>
        <ErrorBoundary>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <LanguageProvider>
              <DialogPortalProvider>{children}</DialogPortalProvider>
            </LanguageProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </GlobalErrorHandlerProvider>
    </>
  );

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* 添加CSS预加载提示，减少404错误 */}
        <meta name="preload" content="styles" />
      </head>
      <body className={inter.className}>
        {hasClerkKey ? (
          <ClerkProvider appearance={{ theme: shadcn }}>{content}</ClerkProvider>
        ) : (
          content
        )}
      </body>
    </html>
  );
}