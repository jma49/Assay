import localFont from "next/font/local";
import { Figtree } from "next/font/google";

// The sign-in page's faces: running text in Figtree, code and labels in Maple Mono (the no-ligature build, so
// SQL operators read as typed); headlines use the site-wide serif (app/layout.tsx). All SIL OFL; Maple Mono ships
// unmodified from its v7.9 release (landing/fonts/MapleMono-OFL.txt).

export const signInSans = Figtree({ subsets: ["latin"], display: "swap", variable: "--font-sign-in-sans" });

export const signInMono = localFont({
  src: [
    { path: "../landing/fonts/MapleMonoNL-Regular.woff2", weight: "400", style: "normal" },
    { path: "../landing/fonts/MapleMonoNL-Medium.woff2", weight: "500", style: "normal" },
  ],
  display: "swap",
  variable: "--font-sign-in-mono",
});
