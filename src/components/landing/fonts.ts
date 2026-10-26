import localFont from "next/font/local";
import { Sofia_Sans, Sofia_Sans_Condensed } from "next/font/google";

// The light table's faces: Sofia Sans for everything read, Sofia Sans Condensed for the lead letters
// printed on films, Maple Mono NL (the no-ligature build, regular only) for SQL, rows and ids.
// All SIL OFL; Maple Mono ships unmodified from its v7.9 release (fonts/MapleMono-OFL.txt).

export const ltSans = Sofia_Sans({ subsets: ["latin"], display: "swap", variable: "--font-lt-sans" });

export const ltLead = Sofia_Sans_Condensed({ subsets: ["latin"], display: "swap", variable: "--font-lt-lead" });

export const ltMono = localFont({
  src: [{ path: "./fonts/MapleMonoNL-Regular.woff2", weight: "400", style: "normal" }],
  display: "swap",
  variable: "--font-lt-mono",
});
