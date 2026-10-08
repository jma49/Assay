import localFont from "next/font/local";
import { Figtree, Instrument_Serif } from "next/font/google";

// The landing page's own faces: headlines in Instrument Serif, running text in Figtree,
// code and labels in Maple Mono (the no-ligature build, so SQL operators read as typed).
// All are SIL OFL; Maple Mono ships unmodified from its v7.9 release.
export const landingSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], display: "swap", variable: "--font-landing-serif" });

export const landingSans = Figtree({ subsets: ["latin"], display: "swap", variable: "--font-landing-sans" });

export const landingMono = localFont({
  src: [
    { path: "./fonts/MapleMonoNL-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/MapleMonoNL-Medium.woff2", weight: "500", style: "normal" },
  ],
  display: "swap",
  variable: "--font-landing-mono",
});
