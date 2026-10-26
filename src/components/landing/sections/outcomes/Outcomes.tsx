import "./outcomes.css";
import type { ReactNode } from "react";
import { useCopy } from "../../lib/i18n";
import { useMotion } from "../../lib/motion";
import { COPIES, FILM, ORIGINALS, outcomesCopy } from "./copy";

const dir = "/landing/outcomes";
type State = "clean" | "issues" | "broken";

/* Plain <img> throughout: every layer is a crop of one bake, placed by percentages (the viewer) or sized against the
   film (the clips); next/image would re-encode the bake and add a srcset the crops do not use. */
function Viewer() {
  return (
    <div className="oc-crop" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- a crop of the one baked viewer (see above) */}
      <img className="oc-off" src={`${dir}/viewer-off-2x.webp`} alt="" width={2880} height={1440} loading="lazy" decoding="async" />
      {/* eslint-disable-next-line @next/next/no-img-element -- the same crop, lit */}
      <img className="oc-on" src={`${dir}/viewer-on-2x.webp`} alt="" width={2880} height={1440} loading="lazy" decoding="async" />
    </div>
  );
}

function Clip({ side }: { side: "a" | "b" }) {
  // eslint-disable-next-line @next/next/no-img-element -- the baked clip, sized against the film (see above)
  return <img className={`oc-clip oc-clip-${side}`} src={`${dir}/clip.webp`} alt="" width={192} height={192} loading="lazy" decoding="async" aria-hidden="true" />;
}

function Cols({ cols }: { cols: readonly string[] }) {
  return (
    <ol className="oc-cols" aria-hidden="true">
      {cols.map((c, i) => (
        <li key={c} className={`c${i + 1}`}>
          {c}
        </li>
      ))}
    </ol>
  );
}

function Lit({ rows, label, className }: { rows: typeof ORIGINALS; label: string; className: string }) {
  return (
    <ol className={`oc-lit ${className}`} aria-label={label}>
      {rows.map(([id, customer, total, day, time]) => (
        <li key={id} className="oc-row">
          <span className="c1">{id}</span>
          <span className="c2">{customer}</span>
          <span className="c3">{total}</span>
          <span className="c4">
            <span className="oc-d">{day} </span>
            {time}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Panel({ n, state, film, clips, cap }: { n: number; state: State; film: ReactNode; clips: 1 | 2; cap: ReactNode }) {
  return (
    <li className={`oc-panel oc-p${n}`} data-state={state} data-oc-panel="">
      <Viewer />
      <div className="oc-mount">
        {film}
        <span className="oc-dim" aria-hidden="true" />
        <Clip side="a" />
        {clips === 2 && <Clip side="b" />}
      </div>
      <div className="oc-cap">{cap}</div>
    </li>
  );
}

/**
 * Outcomes (room): a three-panel viewer. Clean (a clear film), Issues (the returned rows lit), Broken (a fogged film
 * hanging from one clip, the real error printed across the fog). The markup is the settled state (every panel lit, the
 * baked fog); outcomes.motion.ts switches the panels on and runs the live fog.
 */
export function Outcomes() {
  const t = useCopy(outcomesCopy);
  const ref = useMotion<HTMLElement>(() => import("./outcomes.motion"));
  const caption = (state: State, count?: boolean) => {
    const c = t[state];
    return (
      <>
        <h3 className="oc-state">
          <span>{c.state}</span>
          <span className={count ? "oc-n count" : "oc-n"}>{c.n}</span>
        </h3>
        <p className="oc-what">{c.p}</p>
        <p className="oc-src">
          <span>{c.check}</span> · <span>{c.when}</span>
        </p>
      </>
    );
  };
  const rebate = (table: string, state: State) => (
    <p className="oc-rebate lead-letters" aria-hidden="true">
      <span>{table}</span>
      <span>{t.rebate[state]}</span>
    </p>
  );
  return (
    <section ref={ref} className="s-outcomes" id="outcomes" data-ground="room" aria-labelledby="oc-title">
      <div className="seam" data-from="lead" aria-hidden="true" />
      <div className="wrap oc-head">
        <h2 className="h2 oc-title" id="oc-title">
          {t.title}
        </h2>
        <p className="lede oc-lede">{t.lede}</p>
      </div>

      <div className="oc-viewer" data-oc-viewer="">
        <ol className="oc-panels" tabIndex={0} aria-label={t.panels}>
          <Panel
            n={1}
            state="clean"
            clips={2}
            film={
              <div className="oc-film oc-film-clean">
                <Cols cols={FILM.payments.cols} />
                {rebate(FILM.payments.table, "clean")}
              </div>
            }
            cap={caption("clean")}
          />
          <Panel
            n={2}
            state="issues"
            clips={2}
            film={
              <div className="oc-film oc-film-issues">
                <Cols cols={FILM.orders.cols} />
                <Lit rows={ORIGINALS} label={t.lit1} className="oc-lit-top" />
                <Lit rows={COPIES} label={t.lit2} className="oc-lit-bot" />
                {rebate(FILM.orders.table, "issues")}
              </div>
            }
            cap={caption("issues", true)}
          />
          <Panel
            n={3}
            state="broken"
            clips={1}
            film={
              <div className="oc-film oc-film-broken" data-oc-fogged="">
                <Cols cols={FILM.orders.cols} />
                <span className="oc-fog" aria-hidden="true" />
                <p className="oc-error">
                  <span className="oc-error-h lead-letters">{t.err}</span>
                  <code>
                    {FILM.error[0]}
                    <br />
                    {FILM.error[1]}
                  </code>
                </p>
                {rebate(FILM.orders.table, "broken")}
              </div>
            }
            cap={caption("broken")}
          />
        </ol>
      </div>
      <p className="wrap oc-note note">{t.note}</p>
    </section>
  );
}
