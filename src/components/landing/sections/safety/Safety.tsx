import "./safety.css";
import { useCopy } from "../../lib/i18n";
import { useMotion } from "../../lib/motion";
import { ART, Bake } from "./Bake";
import { DRAFT, safetyCopy } from "./copy";

/**
 * Safety (lead): a write is a refused exposure. A slit beam carries the DELETE draft toward four cast-lead plates, one
 * per read-only layer, and the first plate's edge stops it dead. The markup is the settled state (beam on and cut, DELETE
 * struck, the refusal printed, every plate lit); safety.motion.ts scrubs the beam in and plays the landing once.
 */
export function Safety() {
  const t = useCopy(safetyCopy);
  const ref = useMotion<HTMLElement>(() => import("./safety.motion"));
  return (
    <section ref={ref} className="s-safety is-mottle" id="safety" data-ground="lead" aria-labelledby="sf-title">
      <div className="seam" data-from="box" aria-hidden="true" />
      <div className="wrap">
        <header className="sf-head">
          <h2 className="h2-xl sf-title" id="sf-title">
            {t.title}
          </h2>
          <p className="lede sf-lede">{t.lede}</p>
        </header>

        <figure className="sf-object" data-sf-object="">
          <div className="sf-stage">
            <Bake className="sf-plates" {...ART.plates} />
            <div className="sf-glints" aria-hidden="true">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className={`sf-glint sf-g${n}`}>
                  <div className="sf-glint-m">
                    <Bake {...ART.glint} />
                  </div>
                </div>
              ))}
            </div>
            <div className="sf-beam-tail" aria-hidden="true" />
            <div className="sf-beam" aria-hidden="true">
              <div className="sf-beam-in">
                <Bake {...ART.beam} />
              </div>
            </div>
            {/* dust drifting through the beam: drawn by safety.motion.ts, empty without JS or motion */}
            <canvas className="sf-dust" aria-hidden="true" />
            <Bake className="sf-cut" {...ART.cut} />

            <div className="sf-slip-pos">
              <div className="sf-slip" data-sf-slip="">
                <span className="sf-slip-light" aria-hidden="true" />
                <p className="sf-rebate lead-letters" aria-hidden="true">
                  <span>{t.draft}</span>
                  <span>{DRAFT.table}</span>
                </p>
                <pre className="sf-sql" aria-label={DRAFT.sql}>
                  <code>
                    <span className="sf-kw">
                      {DRAFT.keyword}
                      <i className="sf-strike" aria-hidden="true" />
                    </span>
                    {DRAFT.rest}
                  </code>
                </pre>
                <div className="sf-refusal">
                  <p className="sf-refusal-h lead-letters">{t.refused}</p>
                  <p className="sf-refusal-msg">{t.msg}</p>
                </div>
              </div>
            </div>

            {/* the four layers in the order a query meets them; the names are engraved in the bake, the notes printed here */}
            <ol className="sf-layers">
              {t.layers.map((layer, i) => (
                <li key={i} className={`sf-band sf-b${i + 1}`}>
                  <span className="sf-veil" aria-hidden="true">
                    <i />
                  </span>
                  <p className="sf-band-p">
                    <b className="sf-band-h">
                      <span className="sf-k">{layer.k}</span>
                      {layer.q && <span className="sf-q">{layer.q}</span>}
                    </b>
                    {layer.q && " "}
                    <span>{layer.p}</span>
                  </p>
                </li>
              ))}
            </ol>
          </div>
          <figcaption className="sr-only">{t.figcap}</figcaption>
        </figure>

        <ul className="sf-markers">
          {t.markers.map((m, i) => (
            <li key={i}>
              <p className="sf-mark">{m.h}</p>
              <p className="sf-mark-p">{m.p}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
