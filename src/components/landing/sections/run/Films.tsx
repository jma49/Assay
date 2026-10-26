import type { CSSProperties } from "react";
import { COLUMNS, ROWS, RUN_A, RUN_B, TAGS, product, sku, type Returned } from "./data";
import type { RunCopy } from "./copy";

const NUMBERS = Array.from({ length: ROWS }, (_, k) => k + 1);
const COVERS = [0, 1, 2, 3, 4, 5];

function ColumnSet() {
  return (
    <>
      <span>{COLUMNS[0]}</span>
      <span className="nm">{COLUMNS[1]}</span>
      <span className="v">{COLUMNS[2]}</span>
      <span className="v">{COLUMNS[3]}</span>
    </>
  );
}

/** The header strip: two column sets on desktop, three on the phone's crop. */
function Head() {
  return (
    <div className="f-head" aria-hidden="true">
      <div>
        <ColumnSet />
      </div>
      <div>
        <ColumnSet />
      </div>
      <div className="h3">
        <ColumnSet />
      </div>
    </div>
  );
}

/** The whole table printed on the film; the rows a run returned are lit. */
function Rows({ lit, hidden }: { lit: Returned; hidden?: boolean }) {
  return (
    <ol className="f-rows" aria-hidden={hidden || undefined}>
      {NUMBERS.map((n) => {
        const values = lit[n];
        return (
          <li key={n} className={values ? "r lit" : "r"}>
            <span>{sku(n)}</span>
            <span className="nm">{product(n)}</span>
            {values && (
              <>
                <span className="v">{values[0]}</span>
                <span className="v">{values[1]}</span>
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Film A (the real run), film B (the composed next run) laid over it, the lead tags and the clips. */
export function Films({ t }: { t: RunCopy }) {
  return (
    <div className="run-films">
      <figure className="rf rf-a" aria-labelledby="run-film-cap">
        <div className="f-lead lead-letters" aria-hidden="true">
          <span>{t.lead.table}</span>
          <i className="reg" />
          <span>{t.lead.runA}</span>
        </div>
        <Head />
        <Rows lit={RUN_A} hidden />
        <div className="f-lead f-foot lead-letters" aria-hidden="true">
          <span>{t.lead.check}</span>
          <i className="reg" />
          <span />
        </div>
        <div className="f-covers" aria-hidden="true">
          {COVERS.map((i) => (
            <i key={i} className="cover" style={{ "--i": i } as CSSProperties} />
          ))}
        </div>
        <figcaption id="run-film-cap" className="sr-only">
          {t.filmCaption}
        </figcaption>
      </figure>
      <div className="rf rf-b" aria-hidden="true">
        <div className="f-lead lead-letters">
          <span>{t.lead.table}</span>
          <i className="reg" />
          <span />
        </div>
        <Head />
        <Rows lit={RUN_B} />
        <div className="f-lead f-foot lead-letters">
          <span>{t.lead.check}</span>
          <i className="reg" />
          <span>{t.lead.runB}</span>
        </div>
      </div>
      <div className="f-tags lead-letters" aria-hidden="true">
        {TAGS.map(([n, change], i) => (
          <span key={n} className={`dtag is-${change}${n > 30 ? " c2" : ""}`} style={{ "--r": (n - 1) % 30, "--i": i } as CSSProperties}>
            {t.change[change]}
          </span>
        ))}
      </div>
      <span className="rclip rclip-l" aria-hidden="true" />
      <span className="rclip rclip-r" aria-hidden="true" />
    </div>
  );
}
