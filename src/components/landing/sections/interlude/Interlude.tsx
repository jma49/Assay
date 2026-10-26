import "./interlude.css";
import type { CSSProperties } from "react";
import { useCopy } from "../../lib/i18n";
import { useMotion } from "../../lib/motion";
import { interludeCopy } from "./copy";

type CheckKey = keyof typeof interludeCopy.en.checks;
type CountKey = keyof typeof interludeCopy.en.n;

/** One plate per demo table: its height on a log scale of its row count (--h), its baked poster, its checks. */
const PLATES: {
  table: string;
  h: number;
  w: number;
  ph: number;
  lead: [string, string?];
  rows?: keyof typeof interludeCopy.en.rows;
  checks: [CheckKey, CountKey | "clean"][];
  wide?: boolean;
}[] = [
  { table: "customers", h: 0.58, w: 330, ph: 668, lead: ["DEMO.CUSTOMERS", "200"], rows: 200, checks: [["emails", 3]] },
  { table: "products", h: 0.4, w: 330, ph: 452, lead: ["DEMO.PRODUCTS", "60"], rows: 60, checks: [["cost", 2]] },
  { table: "inventory", h: 0.4, w: 330, ph: 452, lead: ["DEMO.INVENTORY", "60"], rows: 60, checks: [["stock", 3]] },
  {
    table: "orders",
    h: 0.89,
    w: 480,
    ph: 1040,
    lead: ["DEMO.ORDERS", "1 506"],
    rows: 1506,
    wide: true,
    checks: [
      ["dup", 6],
      ["unpaid", 5],
      ["mismatch", 4],
      ["stale", 74],
    ],
  },
  { table: "order_items", h: 1, w: 330, ph: 1172, lead: ["DEMO.ORDER_ITEMS"], checks: [["orphans", 2]] },
  { table: "payments", h: 0.86, w: 330, ph: 1004, lead: ["DEMO.PAYMENTS"], checks: [["refunds", "clean"]] },
];

/**
 * The interlude (#plates, room): a light wall of six radiographs, one per demo table, one line per row, the returned
 * rows lit. The baked posters are the settled state; interlude.motion.ts paints the canvases and switches the wall on.
 */
export function Interlude() {
  const t = useCopy(interludeCopy);
  const ref = useMotion<HTMLElement>(() => import("./interlude.motion"));
  return (
    <section ref={ref} className="s-interlude lt-house" id="plates" data-ground="room" aria-labelledby="interlude-title">
      <div className="houselights" aria-hidden="true" />
      <div className="house-in" aria-hidden="true" />
      <div className="il-spill" aria-hidden="true" />
      <div className="wrap il-head">
        <h2 id="interlude-title" className="h2">
          {t.title}
        </h2>
        <div className="il-side">
          <p className="lede">{t.lede}</p>
          <p className="note il-caption">{t.caption}</p>
        </div>
      </div>
      <div className="il-pin">
        <div className="il-viewport" role="region" aria-label={t.wall} tabIndex={0}>
          <div className="il-wall">
            <span className="il-rail" aria-hidden="true" />
            {PLATES.map((p) => (
              <figure
                key={p.table}
                className={`plate${p.wide ? " plate-wide" : ""}${p.checks[0]![1] === "clean" ? " is-clean" : ""}`}
                data-table={p.table}
                style={{ "--h": p.h } as CSSProperties}
              >
                <div className="plate-box">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a baked poster under the canvases that replace it, in an exact pixel box */}
                  <img className="plate-poster" src={`/landing/interlude/${p.table}.webp`} alt="" width={p.w} height={p.ph} loading="lazy" decoding="async" />
                  <canvas className="plate-film" aria-hidden="true" />
                  <div className="plate-lit" aria-hidden="true">
                    <div className="plate-lit-in">
                      <canvas className="plate-rows" />
                    </div>
                  </div>
                  <canvas className="plate-flare" aria-hidden="true" />
                  <span className="plate-scan" aria-hidden="true" />
                  <span className="plate-dark" aria-hidden="true" />
                  <p className="plate-lead" aria-hidden="true">
                    {p.lead.map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </p>
                </div>
                <span className="plate-clip" aria-hidden="true" />
                <span className="plate-clip" aria-hidden="true" />
                <figcaption className="plate-tag">
                  <p className="plate-name">
                    <code>demo.{p.table}</code>
                    {p.rows && <span>{t.rows[p.rows]}</span>}
                  </p>
                  {p.checks.map(([check, n]) => (
                    <p key={check} className="plate-check">
                      <span>{t.checks[check]}</span> {n === "clean" ? <b className="il-zero">{t.clean}</b> : <b className="il-count">{t.n[n]}</b>}
                    </p>
                  ))}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
