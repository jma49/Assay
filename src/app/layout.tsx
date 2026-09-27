import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";
import { BRAND, BRAND_TAGLINE } from "@/lib/brand";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/components/common/LanguageProvider";
import CSSErrorHandler from "@/components/error/CSSErrorHandler";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { GlobalErrorHandlerProvider } from "@/components/error/GlobalErrorHandlerProvider";
import { DialogPortalProvider } from "@/components/common/DialogPortalProvider";

// Self-hosted by next/font. Manrope for the interface and headings (its round
// forms suit the mascot and stay clear in dense tables), JetBrains Mono for
// code and ids.
const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-manrope" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], display: "swap", variable: "--font-jetbrains-mono" });

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
    <html lang="en" className={`${manrope.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body>
        {content}
      </body>
    </html>
  );
}