import type { CSSProperties } from "react";
import { useLanding } from "../../lib/context";
import { useCopy } from "../../lib/i18n";
import { selfhostCopy } from "./copy";
import { GEO, type Layout } from "./plate-geo";

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/**
 * One engraved value as live text: a window over its engraved row (the same box the motion's strips wipe open), the
 * text drawn in the plate's image coordinates. Etched and black-filled like the bake: the ink, and the groove's lit
 * lower lip.
 */
function LiveRow({ g, slot, text, kind }: { g: Layout; slot: Layout["live"]["version"]; text: string; kind: string }) {
  const [row, x, y, anchor, size] = slot;
  const [cy, h] = g.rows[row]!;
  const top = cy - h / 2;
  const w = g.x1 - g.x0;
  const win: CSSProperties = { left: pct(g.x0, g.w), top: pct(top, g.h), width: pct(w, g.w), height: pct(h, g.h) };
  const art: CSSProperties = { width: `${(g.w / w) * 100}%`, height: `${(g.h / h) * 100}%`, left: `${(-g.x0 / w) * 100}%`, top: `${(-top / h) * 100}%` };
  return (
    <span className="sh-eng-win sh-live-row" data-live={kind} data-row={row} style={win}>
      <span className="sh-eng-mv">
        <span className="sh-eng-mv">
          <svg viewBox={`0 0 ${g.w} ${g.h}`} preserveAspectRatio="none" style={art} aria-hidden="true">
            <g textAnchor={anchor} fontSize={size}>
              <text className="sh-live-lip" x={x + 0.6} y={y + 0.7}>
                {text}
              </text>
              <text className="sh-live-ink" x={x} y={y}>
                {text}
              </text>
            </g>
          </svg>
        </span>
      </span>
    </span>
  );
}

/** The rating plate: the baked steel (the no-JS state), the release values live, the facts again for screen readers. */
export function Plate() {
  const { language, release } = useLanding();
  const t = useCopy(selfhostCopy);
  const app = `Next.js ${release.next} · Node ${release.node}+`;
  return (
    <figure className="sh-plate" aria-labelledby="sh-plate-cap">
      <div className="sh-plate-shadow" aria-hidden="true" />
      <div className="sh-plate-body">
        <picture className="sh-plate-img">
          <source media="(max-width: 959px)" srcSet={`/landing/selfhost/plate-p-${language}.webp`} width={414} height={724} />
          {/* baked 1x/2x plates with a portrait crop, art-directed by <picture>; the motion wipes these exact files */}
          <img
            src={`/landing/selfhost/plate-d-${language}.webp`}
            srcSet={`/landing/selfhost/plate-d-${language}-1x.webp 1x, /landing/selfhost/plate-d-${language}.webp 2x`}
            width={988}
            height={688}
            alt=""
            loading="lazy"
            decoding="async"
          />
        </picture>
        {(["d", "p"] as const).map((layout) => (
          <div key={layout} className={`sh-live sh-live-${layout}`} aria-hidden="true">
            <LiveRow g={GEO[layout]} slot={GEO[layout].live.version} text={layout === "p" ? `v${release.version}` : release.version} kind="version" />
            <LiveRow g={GEO[layout]} slot={GEO[layout].live.app} text={app} kind="app" />
          </div>
        ))}
        <div className="sh-plate-dim" aria-hidden="true">
          <i />
        </div>
      </div>
      <figcaption id="sh-plate-cap" className="sr-only">
        {`${t.plateCap[0]}${release.version}${t.plateCap[1]}`}
      </figcaption>
      <dl className="sr-only">
        <dt>{t.k.license}</dt>
        <dd>Apache-2.0</dd>
        <dt>{t.k.version}</dt>
        <dd>{release.version}</dd>
        <dt>{t.k.app}</dt>
        <dd>{`Next.js ${release.next}, Node ${release.node}+`}</dd>
        <dt>{t.k.store}</dt>
        <dd>{t.v.store}</dd>
        <dt>{t.k.reads}</dt>
        <dd>{t.v.reads}</dd>
        <dt>{t.k.signin}</dt>
        <dd>{t.v.signin}</dd>
        <dt>{t.k.schedule}</dt>
        <dd>{t.v.schedule}</dd>
        <dt>{t.k.trigger}</dt>
        <dd>{t.v.trigger}</dd>
        <dt>{t.k.cache}</dt>
        <dd>{t.v.cache}</dd>
      </dl>
    </figure>
  );
}
