import type { Metadata } from "next";
import "./globals.css";
import { BRAND, BRAND_TAGLINE } from "@/lib/brand";
import { LanguageProvider } from "@/components/common/LanguageProvider";
import CSSErrorHandler from "@/components/error/CSSErrorHandler";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { GlobalErrorHandlerProvider } from "@/components/error/GlobalErrorHandlerProvider";
import { DialogPortalProvider } from "@/components/common/DialogPortalProvider";
import { appLead, appMono, appSans } from "@/components/type/fonts";

// Self-hosted by next/font and shared with the landing, so one download serves the whole product.

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
  const content = (
    <>
      <CSSErrorHandler />
      <GlobalErrorHandlerProvider>
        <ErrorBoundary>
          <LanguageProvider>
            <DialogPortalProvider>{children}</DialogPortalProvider>
          </LanguageProvider>
        </ErrorBoundary>
      </GlobalErrorHandlerProvider>
    </>
  );

  return (
    <html lang="en" className={`${appSans.variable} ${appLead.variable} ${appMono.variable}`} suppressHydrationWarning>
      <body>
        {content}
      </body>
    </html>
  );
}