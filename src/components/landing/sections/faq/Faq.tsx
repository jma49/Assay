import "./faq.css";
import Link from "next/link";
import type { ReactNode } from "react";
import { useLanding } from "../../lib/context";
import { useCopy } from "../../lib/i18n";
import { useMotion } from "../../lib/motion";
import { faqCopy } from "./copy";
import { HangerDefs, HangerHook, SpringClips } from "./Hardware";

/** Two bays of the rack: questions 1-4 and 5-7. The first film of each bay hangs (only Q1 in one column). */
const COLUMNS = [
  [0, 1, 2, 3],
  [4, 5, 6],
];

function Hanger({ index, open, q, a }: { index: number; open: boolean; q: string; a: ReactNode }) {
  const n = index + 1;
  return (
    <li className={open ? "hg is-open" : "hg"}>
      <span className="hg-rail" aria-hidden="true" />
      <div className="hg-body">
        <HangerHook />
        <h3 className="hg-q">
          {/* Without JS every film hangs: the markup is expanded; faq.motion.ts closes all but the first of each bay. */}
          <button className="hg-tab" type="button" aria-expanded="true" aria-controls={`faq-a${n}`} id={`faq-q${n}`}>
            <span className="hg-text">{q}</span>
            <span className="hg-pin" aria-hidden="true" />
          </button>
          <SpringClips />
        </h3>
        <div className="hg-a" id={`faq-a${n}`} role="region" aria-labelledby={`faq-q${n}`}>
          <div className="hg-film">
            <span className="hg-id lead-letters" aria-hidden="true">
              ASSAY · FAQ {String(n).padStart(2, "0")}
            </span>
            {a}
          </div>
        </div>
      </div>
    </li>
  );
}

export function Faq() {
  const { links } = useLanding();
  const t = useCopy(faqCopy);
  const ref = useMotion<HTMLElement>(() => import("./faq.motion"));
  return (
    <section ref={ref} className="s-faq is-grain" id="faq" data-ground="daylight" aria-labelledby="faq-title">
      <HangerDefs />
      <div className="wrap faq-inner">
        <header className="faq-head">
          <h2 id="faq-title" className="h2">
            {t.title}
          </h2>
          <Link className="btn btn-ghost faq-more" href={links.faq}>
            <span>{t.more}</span>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 8h9.5M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </header>
        <div className="rack">
          {COLUMNS.map((column, c) => (
            <ul key={c} className="rack-col" role="list">
              {column.map((i) => {
                const item = t.items[i];
                return item && <Hanger key={i} index={i} open={i === column[0]} q={item.q} a={item.a} />;
              })}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
