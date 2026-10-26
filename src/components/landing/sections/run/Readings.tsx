import { Fragment } from "react";
import { DIFF, PROOF, RUN_A, SQL, SQL_FOCUS, COLUMNS, product, sku, valuesOf, type Change } from "./data";
import type { RunCopy } from "./copy";

const RETURNED_A = Object.entries(RUN_A).map(([n, values]) => [Number(n), values] as const);

/** Step 1: the check's SQL on a strip of film, WHERE in focus. */
function Slip({ t }: { t: RunCopy }) {
  return (
    <div className="slip obj obj-0">
      <p className="slip-head lead-letters">
        <span>{t.lead.check}</span>
        <span>{t.lead.sql}</span>
      </p>
      <pre className="slip-sql proof" aria-label="SQL">
        <code>
          {SQL.map((parts, i) => (
            <span key={i} className={i === SQL_FOCUS ? "sl focus" : "sl"}>
              <span className="ln">{i + 1}</span>
              {parts.map((part, j) =>
                j % 2 ? (
                  part
                ) : (
                  <span key={j} className="k">
                    {part}
                  </span>
                ),
              )}
            </span>
          ))}
        </code>
      </pre>
      <p className="slip-foot">
        <code>{PROOF.readOnly}</code>
        <span>
          <code>{PROOF.timeout}</code> <span>{t.timeout}</span>
        </span>
      </p>
    </div>
  );
}

/** A returned row lifted off the film for the desktop readout: the same four columns, lit as on the film. */
function Strip({ n, change }: { n: number; change: Change }) {
  const [onHand, reserved] = valuesOf(n);
  return (
    <span className={`ds is-${change}`} aria-hidden="true">
      <span>{sku(n)}</span>
      <span>{product(n)}</span>
      <span className="v">{onHand}</span>
      <span className="v">{reserved}</span>
    </span>
  );
}

/** Step 2: the count and the rows run A returned. */
function Returned({ t }: { t: RunCopy }) {
  return (
    <div className="rd obj obj-1">
      <p className="rd-k">
        <span>{t.runA}</span>
      </p>
      <p className="rd-big">
        <b className="rd-n">{RETURNED_A.length}</b>
        <span className="rd-u">
          <span className="rd-w">{t.rows}</span> <span className="rd-st">{t.issues}</span>
        </span>
      </p>
      <table className="rd-table proof">
        <thead>
          <tr>
            {COLUMNS.map((name, i) => (
              <th key={name} className={i > 1 ? "v" : undefined}>
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {RETURNED_A.map(([n, [onHand, reserved]]) => (
            <tr key={n}>
              <td>{sku(n)}</td>
              <td>{product(n)}</td>
              <td className="v">{onHand}</td>
              <td className="v">{reserved}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="rd-note">{t.realA}</p>
    </div>
  );
}

/** Step 3: what changed between the two films. */
function Diff({ t }: { t: RunCopy }) {
  return (
    <div className="rd obj obj-2">
      <p className="rd-k">
        <span className="tag">{t.example}</span> <span>{t.runB}</span>
      </p>
      <ul className="rd-diff" role="list">
        {DIFF.map(([change, rows]) => (
          <li key={change} className={`dg-${change}`}>
            <span className={`dm is-${change}`} aria-hidden="true" />
            <b>{rows.length}</b>
            <span className="dl">
              <span>{t.change[change]}</span>
              <span className="dc">
                {rows.map((n, i) => (
                  <Fragment key={n}>
                    {i > 0 && " "}
                    <code>{sku(n)}</code>
                  </Fragment>
                ))}
              </span>
            </span>
            {rows.map((n) => (
              <Strip key={n} n={n} change={change} />
            ))}
          </li>
        ))}
      </ul>
      <p className="rd-note">{t.rowKey}</p>
    </div>
  );
}

/** Step 4: the alert assay sends for that change. Its message is the one object that leaves the box. */
function Alert({ t }: { t: RunCopy }) {
  return (
    <figure className="alert obj obj-3" aria-labelledby="run-alert-cap">
      <div className="al-top" aria-hidden="true">
        <p className="rd-k">
          <span className="tag">{t.example}</span> <span>{t.runB}</span>
        </p>
        <p className="al-diff">
          {DIFF.map(([change, rows]) => (
            <span key={change}>
              <span className={`dm is-${change}`} />
              <b>{rows.length}</b> <span>{t.change[change]}</span>
            </span>
          ))}
        </p>
      </div>
      <div className="alert-msg">
        <span className="alert-lift" aria-hidden="true" />
        <div className="alert-body">
          <p className="alert-from">
            <span className="alert-mark" aria-hidden="true">
              <svg viewBox="0 0 20 20">
                <rect x="2.5" y="3.5" width="15" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <rect x="5" y="9.25" width="10" height="1.5" rx=".75" fill="currentColor" />
              </svg>
            </span>
            <b>{PROOF.from}</b>
            <span className="alert-time">{PROOF.time}</span>
          </p>
          <p className="alert-title">{t.alert.title}</p>
          <p className="alert-lines">
            <span>{t.alert.line1}</span>
            <br />
            <span>{t.alert.line2}</span>
          </p>
          <div className="alert-actions">
            <span className="abtn">{t.alert.open}</span>
            <span className="abtn abtn-ink">{t.alert.ack}</span>
            <span className="abtn">{t.alert.mute}</span>
          </div>
        </div>
      </div>
      <figcaption id="run-alert-cap" className="alert-cap">
        <span className="tag">{t.example}</span> <span>{t.alert.caption}</span>
      </figcaption>
    </figure>
  );
}

/** The four objects of the right third, one per step. */
export function Readings({ t }: { t: RunCopy }) {
  return (
    <>
      <Slip t={t} />
      <Returned t={t} />
      <Diff t={t} />
      <Alert t={t} />
    </>
  );
}
