import "./run.css";
import "./run.story.css";
import "./run.narrow.css";
import "./run.page.css";
import { useCopy } from "../../lib/i18n";
import { useMotion } from "../../lib/motion";
import { runCopy } from "./copy";
import { Films } from "./Films";
import { Readings } from "./Readings";
import type { RunData } from "./run.motion";

/**
 * Section 2, the signature: one check (Negative inventory) read on the lit face of the light box in four steps. The
 * markup is the settled composition (no JS, reduced motion): both films registered, the SQL, the rows, the diff, the
 * alert and all four step texts. With motion, html.lt-run-story turns it into the pinned story (desktop) or the sticky
 * film (tablet, phone); run.motion.ts plays it. The first step is rendered
 * current, so the story is whole before the module mounts.
 */
export function Run() {
  const t = useCopy(runCopy);
  const ref = useMotion<HTMLElement, RunData>(() => import("./run.motion"), t.read);
  return (
    <section ref={ref} className="s-run" id="run" data-ground="box" aria-labelledby="run-title">
      <div className="run-pin">
        <div className="run-box" aria-hidden="true" />
        <div className="run-inner">
          <div className="run-text">
            <h2 id="run-title" className="h2 run-h2">
              {t.title}
            </h2>
            <p className="run-lede">{t.lede}</p>
            <ol className="run-steps" role="list">
              {t.steps.map((step, i) => (
                <li key={i} className={i === 0 ? "run-step is-on" : "run-step"} data-step={i}>
                  {/* enabled by run.motion.ts once a click can move the story: no inert buttons without JS or motion */}
                  <button type="button" className="step-btn" aria-controls="run-stage" disabled>
                    <span className="step-n">{i + 1}</span>
                    <span>{step.title}</span>
                  </button>
                  <div className="step-body">
                    <p>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="run-stage" id="run-stage" data-at="0">
            <div className="run-viewer">
              <Films t={t} />
              <Readings t={t} />
            </div>
          </div>
        </div>
        <div className="run-dim" aria-hidden="true" />
      </div>
    </section>
  );
}
