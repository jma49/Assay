import localFont from "next/font/local";
import { Figtree } from "next/font/google";

// The landing page's own faces: running text in Figtree, code and labels in Maple Mono (the
// no-ligature build, so SQL operators read as typed); headlines use the site-wide serif (app/layout.tsx).
// All are SIL OFL; Maple Mono ships unmodified from its v7.9 release.

export const landingSans = Figtree({ subsets: ["latin"], display: "swap", variable: "--font-landing-sans" });

export const landingMono = localFont({
  src: [
    { path: "./fonts/MapleMonoNL-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/MapleMonoNL-Medium.woff2", weight: "500", style: "normal" },
  ],
  display: "swap",
  variable: "--font-landing-mono",
});
