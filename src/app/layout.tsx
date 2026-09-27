import type { Metadata } from "next";
import { EB_Garamond, Geist, Geist_Mono } from "next/font/google";
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

// Self-hosted by next/font. Geist for the interface and code; EB Garamond
// only for page titles, the one brand accent in the type.
const geist = Geist({ subsets: ["latin"], display: "swap", variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], display: "swap", variable: "--font-geist-mono" });
const garamond = EB_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-garamond",
});

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
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <LanguageProvider>
              <DialogPortalProvider>{children}</DialogPortalProvider>
            </LanguageProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </GlobalErrorHandlerProvider>
    </>
  );

  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${garamond.variable}`} suppressHydrationWarning>
      <body>
        {hasClerkKey ? (
          <ClerkProvider appearance={{ theme: shadcn }}>{content}</ClerkProvider>
        ) : (
          content
        )}
      </body>
    </html>
  );
}