import type { ReactNode } from "react";
import { useCopy } from "../../lib/i18n";
import { workflowCopy } from "./copy";

/* The film strip's frames. Edge print on the rebates and leaders is film stock lettering: the same in both languages.
   [data-b] / [data-type] / [data-mark] are the beats workflow.motion.ts plays (latent until their beat). */

const TOOLS = ["get_check", "list_data_sources", "get_run", "list_activity", "run_check", "acknowledge_check", "mute_check"];

function Film({ top, bottom, window: win }: { top: ReactNode; bottom: ReactNode; window: ReactNode }) {
  return (
    <div className="wf-film">
      <div className="wf-rebate" aria-hidden="true">
        {top}
      </div>
      <div className="wf-base">{win}</div>
      <div className="wf-rebate wf-rebate-b" aria-hidden="true">
        {bottom}
      </div>
      <span className="wf-shade" aria-hidden="true" />
    </div>
  );
}

function Caption({ n }: { n: number }) {
  const c = useCopy(workflowCopy).captions[n - 1]!;
  return (
    <div className="wf-cap">
      <h3 className="wf-cap-t">
        <span className="wf-cap-n">{n}</span>
        <span>{c.title}</span>
      </h3>
      <p>{c.body}</p>
    </div>
  );
}

/** The window's own layers: the veil a slit of light sweeps off (snap strip) and the lamp's flash as a frame seats. */
function Layers() {
  return (
    <>
      <span className="wf-veil" aria-hidden="true" />
      <span className="wf-flash" aria-hidden="true" />
    </>
  );
}

export function HeadLeader() {
  const t = useCopy(workflowCopy);
  return (
    <li className="wf-cell wf-leader wf-head-leader" aria-hidden="true">
      <div className="wf-film">
        <div className="wf-rebate">
          <span className="wf-ep">HEAD</span>
          <span className="wf-ep">ASSAY · DEMO · WORKFLOW</span>
        </div>
        <div className="wf-base">
          <div className="wf-window wf-blank">
            <div className="wf-slate">
              <p className="wf-slate-k">HEAD ▸ ASSAY · DEMO</p>
              <p className="wf-slate-n">
                3 <span>{t.slate.frames}</span>
              </p>
              <ol className="wf-slate-l">
                <li>
                  <span className="wf-slate-i">1</span>
                  <span>{t.slate.review}</span>
                </li>
                <li>
                  <span className="wf-slate-i">2</span>
                  <span>{t.slate.triage}</span>
                </li>
                <li>
                  <span className="wf-slate-i">3</span>
                  <span>MCP</span>
                </li>
              </ol>
            </div>
            <span className="wf-start">START</span>
          </div>
        </div>
        <div className="wf-rebate wf-rebate-b">
          <span className="wf-ep">ASSAY · DEMO</span>
          <span className="wf-ep">3 FRAMES ▸</span>
        </div>
      </div>
    </li>
  );
}

export function TailLeader() {
  const t = useCopy(workflowCopy);
  return (
    <li className="wf-cell wf-leader wf-tail-leader" aria-hidden="true">
      <div className="wf-film">
        <div className="wf-rebate">
          <span className="wf-ep">TAIL</span>
          <span className="wf-ep">ASSAY · DEMO</span>
        </div>
        <div className="wf-base">
          <div className="wf-window wf-blank">
            <div className="wf-slate wf-slate-tail">
              <p className="wf-slate-k">◂ TAIL · ASSAY · DEMO</p>
              <p className="wf-slate-n">{t.slate.end}</p>
              <p className="wf-slate-k wf-slate-k2">3 / 3</p>
            </div>
            <span className="wf-start wf-end">END</span>
          </div>
        </div>
        <div className="wf-rebate wf-rebate-b">
          <span className="wf-ep">TAIL</span>
        </div>
      </div>
    </li>
  );
}

/** 1 · review before it runs (the seeded approval requests) */
export function FrameReview() {
  const t = useCopy(workflowCopy).f1;
  return (
    <li className="wf-cell" data-wf-frame="1" id="wf-f1">
      <Film
        top={
          <>
            <span className="wf-ep">ASSAY · DEMO</span>
            <span className="wf-ep">▸ 1</span>
            <span className="wf-ep">1A</span>
          </>
        }
        bottom={
          <>
            <span className="wf-ep wf-ep-n">1</span>
            <span className="wf-ep">▸ 1A</span>
          </>
        }
        window={
          <div className="wf-window wf-w1">
            <Layers />
            <div className="wf-col">
              <p className="wf-op">
                <span>{t.op}</span> · <span className="mono">alex@example.com</span>
              </p>
              <p className="wf-name">{t.name}</p>
              <p className="wf-note">“Checkout sometimes creates an order before its items are written.”</p>
              <div className="wf-code">
                <pre>
                  <code>
                    <b>SELECT</b> o.id <b>AS</b>
                    {" order_id,\n       o.status, o.created_at\n"}
                    <b>FROM</b>
                    {" demo.orders o\n"}
                    <b>WHERE NOT EXISTS</b>
                    {" (\n  "}
                    <b>SELECT</b>
                    {" 1\n  "}
                    <b>FROM</b>
                    {" demo.order_items oi\n  "}
                    <b>WHERE</b>
                    {" oi.order_id = o.id);"}
                  </code>
                </pre>
                <span className="wf-readline" aria-hidden="true" />
              </div>
            </div>
            <div className="wf-col wf-col-r">
              <div className="wf-row">
                <span className="wf-tag wf-tag-wait lead-letters">{t.pending}</span>
                <span className="wf-chips" aria-hidden="true">
                  <span className="wf-chip">{t.approve}</span>
                  <span className="wf-chip">{t.reject}</span>
                </span>
              </div>
              <p className="wf-wait">{t.wait}</p>
              <div className="wf-hist">
                <p className="wf-sub">
                  <span>{t.hist}</span> · <span>{t.rev}</span> <span className="mono">admin@example.com</span>
                </p>
                <div className="wf-dec" data-b="">
                  <p className="wf-dec-h">
                    <span className="wf-tag wf-tag-ok lead-letters" data-mark="">
                      {t.approved}
                    </span>
                    <span className="wf-by mono">riley@example.com</span>
                  </p>
                  <p>
                    <span>{t.d1}</span> <span className="wf-quote">“Looks good.”</span>
                  </p>
                </div>
                <div className="wf-dec" data-b="">
                  <p className="wf-dec-h">
                    <span className="wf-tag wf-tag-no lead-letters" data-mark="">
                      {t.rejected}
                    </span>
                    <span className="wf-by mono">casey@example.com</span>
                  </p>
                  <p>
                    <span>{t.d2}</span> <span className="wf-quote">“A check should return only rows that need attention, not a full export.”</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        }
      />
      <Caption n={1} />
    </li>
  );
}

/** 2 · AI triage on a broken run (the error is the live run of 2026-09-29; the answer is composed: Example) */
export function FrameTriage() {
  const { f2: t, ex } = useCopy(workflowCopy);
  const missing = (
    <i>
      shipping_status
      <span className="wf-ul" data-b="" />
    </i>
  );
  return (
    <li className="wf-cell" data-wf-frame="2" id="wf-f2">
      <Film
        top={
          <>
            <span className="wf-ep">▸ 2</span>
            <span className="wf-ep">SEP 29 · 11:55 UTC</span>
            <span className="wf-ep">2A</span>
          </>
        }
        bottom={
          <>
            <span className="wf-ep wf-ep-n">2</span>
            <span className="wf-ep">▸ 2A</span>
          </>
        }
        window={
          <div className="wf-window wf-w2">
            <Layers />
            <div className="wf-col">
              <p className="wf-op wf-op-2">{t.name}</p>
              <div className="wf-fog">
                <span className="wf-fog-churn" aria-hidden="true" />
                <span className="wf-fog-mark lead-letters">{t.broken}</span>
                <span className="wf-fog-note">{t.fog}</span>
              </div>
              <p className="wf-err">
                <span className="wf-err-k lead-letters">ERROR</span> <span className="mono">column &quot;shipping_status&quot; does not exist</span>
              </p>
              <div className="wf-code">
                <pre>
                  <code>
                    <b>SELECT</b> id <b>AS</b>
                    {" order_id,\n       "}
                    {missing}
                    {"\n"}
                    <b>FROM</b>
                    {" demo.orders\n"}
                    <b>WHERE</b>
                    {" status = 'shipped'\n  "}
                    <b>AND</b> {missing} <b>IS NULL</b>;
                  </code>
                </pre>
              </div>
            </div>
            <div className="wf-col wf-col-r">
              <div className="wf-triage">
                <span className="wf-btn" aria-hidden="true">
                  <span className="wf-btn-in">{t.run}</span>
                </span>
                <div className="wf-row" data-b="">
                  <span className="wf-kind lead-letters">{t.kind}</span>
                  <span className="wf-ex">{ex}</span>
                </div>
                <p className="wf-sum" data-type="">
                  {t.sum}
                </p>
                <p className="wf-next" data-type="">
                  {t.next}
                </p>
              </div>
              <dl className="wf-sent" data-b="">
                <div>
                  <dt>{t.sent}</dt>
                  <dd>{t.sentv}</dd>
                </div>
                <div>
                  <dt>{t.never}</dt>
                  <dd>{t.neverv}</dd>
                </div>
              </dl>
            </div>
          </div>
        }
      />
      <Caption n={2} />
    </li>
  );
}

/** 3 · agents through MCP (the call is composed: Example; the result has the shape of src/server/mcp/tools.ts) */
export function FrameMcp() {
  const { f3: t, ex } = useCopy(workflowCopy);
  return (
    <li className="wf-cell" data-wf-frame="3" id="wf-f3">
      <Film
        top={
          <>
            <span className="wf-ep">▸ 3</span>
            <span className="wf-ep">3A</span>
          </>
        }
        bottom={
          <>
            <span className="wf-ep wf-ep-n">3</span>
            <span className="wf-ep">▸ 3A</span>
            <span className="wf-ep">ASSAY · DEMO</span>
          </>
        }
        window={
          <div className="wf-window wf-w3">
            <Layers />
            <div className="wf-col">
              <div className="wf-row">
                <span className="wf-op">
                  <span className="mono">POST /api/mcp</span>
                </span>
                <span className="wf-ex">{ex}</span>
              </div>
              <p className="wf-call">
                <span className="wf-dir" aria-hidden="true" data-b="">
                  →
                </span>
                <span className="mono" data-type="">
                  {'list_checks {"status": "broken"}'}
                </span>
              </p>
              <div className="wf-code wf-json">
                <span className="wf-dir wf-dir-in" aria-hidden="true" data-b="">
                  ←
                </span>
                <pre>
                  <code>
                    <span data-b="">{'{ "count": 1, "checks": [{'}</span>
                    {"\n"}
                    <span data-b="">{'  "id": "demo-broken-shipping-check",'}</span>
                    {"\n"}
                    <span data-b="">
                      {'  "name":'}
                      <span className="wf-wrap">{"\n   "}</span>
                      {' "Shipping status check (broken)",'}
                    </span>
                    {"\n"}
                    <span data-b="">{'  "status": "broken", "rows": null,'}</span>
                    {"\n"}
                    <span data-b="">{'  "since": "2026-09-24T09:57:35.999Z",'}</span>
                    {"\n"}
                    <span data-b="">{'  "last_run_at":'}</span>
                    {"\n"}
                    <span data-b="">{'    "2026-09-29T11:55:47.394Z",'}</span>
                    {"\n"}
                    <span data-b="">{'  "schedule": "manual", …'}</span>
                    {"\n"}
                    <span data-b="">{"}] }"}</span>
                  </code>
                </pre>
              </div>
            </div>
            <div className="wf-col wf-col-r wf-tools">
              <p className="wf-sub">{t.tools}</p>
              <ul className="mono">
                <li className="is-called">
                  list_checks
                  <span className="wf-ul" data-b="" />
                </li>
                {TOOLS.map((tool) => (
                  <li key={tool}>{tool}</li>
                ))}
              </ul>
            </div>
          </div>
        }
      />
      <Caption n={3} />
    </li>
  );
}
