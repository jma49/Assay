import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { BRAND, BRAND_TAGLINE } from "@/lib/brand";
import { LanguageProvider } from "@/components/common/LanguageProvider";
import CSSErrorHandler from "@/components/error/CSSErrorHandler";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { GlobalErrorHandlerProvider } from "@/components/error/GlobalErrorHandlerProvider";
import { DialogPortalProvider } from "@/components/common/DialogPortalProvider";

// Self-hosted by next/font. Geist for the interface, Geist Mono for code, ids and
// numbers that line up in columns, Instrument Serif (SIL OFL) for page and landing titles.
const geist = Geist({ subsets: ["latin"], display: "swap", variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], display: "swap", variable: "--font-geist-mono" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], display: "swap", variable: "--font-serif" });

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
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${serif.variable}`} suppressHydrationWarning>
      <body>
        {content}
      </body>
    </html>
  );
}