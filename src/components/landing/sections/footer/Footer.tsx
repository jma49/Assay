import "./footer.css";
import Link from "next/link";
import { useLanding } from "../../lib/context";
import { useCopy } from "../../lib/i18n";
import { useMotion } from "../../lib/motion";
import { BrandMark } from "../nav/BrandMark";
import { navCopy, SECTION_IDS } from "../nav/copy";
import { SessionLink } from "../nav/SessionLink";
import { footerCopy } from "./copy";
import { Etching } from "./Etching";

export function Footer() {
  const { language, setLanguage, demoHref, links } = useLanding();
  const nav = useCopy(navCopy);
  const t = useCopy(footerCopy);
  const ref = useMotion<HTMLElement>(() => import("./footer.motion"));
  return (
    <footer ref={ref} className="footer" data-ground="room">
      <figure className="foot-art wrap" aria-hidden="true">
        <Etching />
        <figcaption className="etch-cap lead-letters">
          <span>{t.sign}</span>
        </figcaption>
      </figure>
      <div className="wrap foot-grid">
        <div className="foot-brand">
          <a className="brand" href="#top">
            <BrandMark />
            <span>assay</span>
          </a>
          <p>{t.tagline}</p>
          <button className="lang lang-foot" type="button" aria-label={nav.langLabel} onClick={() => setLanguage(language === "zh" ? "en" : "zh")}>
            <span lang={nav.langTag}>{nav.lang}</span>
          </button>
        </div>
        <div>
          <p className="foot-h">{t.page}</p>
          {SECTION_IDS.map((id) => (
            <a key={id} href={`#${id}`}>
              {nav.sections[id]}
            </a>
          ))}
        </div>
        <div>
          <p className="foot-h">{t.product}</p>
          <Link href={demoHref} prefetch={false}>
            {t.demo}
          </Link>
          <Link href={links.docs}>{nav.docs}</Link>
          <Link href={links.mcp}>{t.mcp}</Link>
          <SessionLink className="foot-session" signIn={nav.signIn} openApp={nav.openApp} />
        </div>
        <div>
          <p className="foot-h">{t.project}</p>
          <a href={links.github}>{t.github}</a>
          <Link href={links.guide}>{t.guide}</Link>
          <a href={links.license}>{t.license}</a>
        </div>
      </div>
      <div className="wrap foot-base">
        <p>{t.note}</p>
      </div>
    </footer>
  );
}
