import localFont from "next/font/local";
import { Sofia_Sans, Sofia_Sans_Condensed } from "next/font/google";

// The app's faces, shared with the landing: Sofia Sans for everything read, Sofia Sans Condensed 800
// for lead markings (film edges, diff tags, role plates), Maple Mono NL (no ligatures, regular) for SQL,
// rows, ids and cron expressions. All SIL OFL; Maple Mono ships unmodified from its v7.9 release
// (font-files/MapleMono-OFL.txt).

export const appSans = Sofia_Sans({ subsets: ["latin"], display: "swap", variable: "--font-app-sans" });

export const appLead = Sofia_Sans_Condensed({ subsets: ["latin"], display: "swap", variable: "--font-app-lead" });

export const appMono = localFont({
  src: [{ path: "./font-files/MapleMonoNL-Regular.woff2", weight: "400", style: "normal" }],
  display: "swap",
  variable: "--font-app-mono",
});
