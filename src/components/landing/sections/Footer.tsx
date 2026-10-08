import Link from "next/link";
import { RowAMark } from "@/components/brand/RowAMark";
import { BRAND, GITHUB_URL, type Language, type LandingCopy } from "../content";
import { cn } from "@/lib/utils/utils";
import { FRAME } from "../ui";

export function Footer({ copy, demoHref, language, setLanguage }: { copy: LandingCopy["footer"]; demoHref: string; language: Language; setLanguage: (l: Language) => void }) {
  const link = "block transition-colors hover:text-ink";
  return (
    <footer className="border-t border-rule text-body-sm text-ink-muted">
      <div className={cn(FRAME, "ticks grid gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-12")}>
        <div>
          <div className="flex items-center gap-2">
            <RowAMark className="size-6 text-ink" />
            <span className="font-display text-title-sm text-ink">{BRAND}</span>
          </div>
          <p className="mt-3 max-w-xs">{copy.tagline}</p>
        </div>
        <div className="space-y-2.5">
          <p className="eyebrow text-caption text-ink">{copy.product}</p>
          <Link className={link} href={demoHref} prefetch={false}>{copy.demo}</Link>
          <Link className={link} href="/docs">{copy.docs}</Link>
          <Link className={link} href="/docs/api-keys">{copy.mcp}</Link>
        </div>
        <div className="space-y-2.5">
          <p className="eyebrow text-caption text-ink">{copy.project}</p>
          <a className={link} href={GITHUB_URL}>GitHub</a>
          <Link className={link} href="/docs/deployment">{copy.guide}</Link>
          <a className={link} href={`${GITHUB_URL}/blob/main/LICENSE`}>{copy.license}</a>
        </div>
        <div className="space-y-2.5">
          <p className="eyebrow text-caption text-ink">{copy.language}</p>
          <button type="button" onClick={() => setLanguage("en")} className={language === "en" ? "block text-ink" : link}>English</button>
          <button type="button" onClick={() => setLanguage("zh")} className={language === "zh" ? "block text-ink" : link}>中文</button>
        </div>
      </div>
    </footer>
  );
}
