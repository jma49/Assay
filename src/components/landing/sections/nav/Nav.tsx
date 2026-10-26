import "./nav.css";
import Link from "next/link";
import { useLanding } from "../../lib/context";
import { useCopy } from "../../lib/i18n";
import { BrandMark } from "./BrandMark";
import { navCopy, SECTION_IDS } from "./copy";
import { SessionLink } from "./SessionLink";

/** The fixed nav: it takes the ground under its bar (lib/page.motion.ts sets data-theme). */
export function Nav() {
  const { language, setLanguage, demoHref, links } = useLanding();
  const t = useCopy(navCopy);
  return (
    <header className="nav" data-theme="room">
      <nav className="nav-bar" aria-label={t.label}>
        <a className="brand" href="#top" aria-label={t.home}>
          <BrandMark />
          <span>assay</span>
        </a>
        <div className="nav-links">
          {SECTION_IDS.map((id) => (
            <a key={id} href={`#${id}`}>
              {t.sections[id]}
            </a>
          ))}
          <Link className="ext" href={links.docs}>
            {t.docs}
          </Link>
        </div>
        <div className="nav-end">
          <button className="lang" type="button" aria-label={t.langLabel} onClick={() => setLanguage(language === "zh" ? "en" : "zh")}>
            <span lang={t.langTag}>{t.lang}</span>
          </button>
          <SessionLink className="nav-signin" signIn={t.signIn} openApp={t.openApp} />
          <Link className="btn btn-ink btn-sm" href={demoHref} prefetch={false}>
            {t.demo}
          </Link>
        </div>
      </nav>
    </header>
  );
}
