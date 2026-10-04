import Link from "next/link";
import { RowAMark } from "@/components/brand/RowAMark";
import { BRAND, GITHUB_URL, type Language, type LandingCopy } from "../content";
import { CONTAINER } from "../ui";

export function Footer({ copy, demoHref, language, setLanguage }: { copy: LandingCopy["footer"]; demoHref: string; language: Language; setLanguage: (l: Language) => void }) {
  const link = "block hover:text-night-foreground";
  return (
    <footer className="border-t border-night-line bg-night py-14 text-body-sm text-night-muted">
      <div className={`${CONTAINER} grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]`}>
        <div>
          <div className="flex items-center gap-2">
            <RowAMark className="size-6" />
            <span className="font-display text-title-sm text-night-foreground">{BRAND}</span>
          </div>
          <p className="mt-3 max-w-xs">{copy.tagline}</p>
        </div>
        <div className="space-y-2.5">
          <p className="text-night-foreground">{copy.product}</p>
          <Link className={link} href={demoHref} prefetch={false}>{copy.demo}</Link>
          <Link className={link} href="/docs">{copy.docs}</Link>
          <Link className={link} href="/docs/api-keys">{copy.mcp}</Link>
        </div>
        <div className="space-y-2.5">
          <p className="text-night-foreground">{copy.project}</p>
          <a className={link} href={GITHUB_URL}>GitHub</a>
          <Link className={link} href="/docs/deployment">{copy.guide}</Link>
          <a className={link} href={`${GITHUB_URL}/blob/main/LICENSE`}>{copy.license}</a>
        </div>
        <div className="space-y-2.5">
          <p className="text-night-foreground">{copy.language}</p>
          <button type="button" onClick={() => setLanguage("en")} className={language === "en" ? "block text-night-foreground" : link}>English</button>
          <button type="button" onClick={() => setLanguage("zh")} className={language === "zh" ? "block text-night-foreground" : link}>中文</button>
        </div>
      </div>
    </footer>
  );
}
