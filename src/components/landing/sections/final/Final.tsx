import "./final.css";
import Link from "next/link";
import { useLanding } from "../../lib/context";
import { useCopy } from "../../lib/i18n";
import { useMotion } from "../../lib/motion";
import { finalCopy } from "./copy";

/**
 * The final, room ground: the box again with a clear film of demo.payments, "0 rows · Clean" printed on its light. The
 * daylight of the FAQ above goes down as it enters (house lights). The markup is the settled set piece; final.motion.ts
 * lowers the film, snaps the clips and strikes the tubes as the reader arrives.
 */
export function Final() {
  const { demoHref, links } = useLanding();
  const t = useCopy(finalCopy);
  const ref = useMotion<HTMLElement>(() => import("./final.motion"));
  return (
    <section ref={ref} className="final lt-house" id="final" data-ground="room" aria-labelledby="final-title">
      <div className="final-stage" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- the baked box at its exact pixel box under the film; served as baked */}
        <img className="final-bake" src="/landing/final/cta-d.jpg" alt="" width={1440} height={800} loading="lazy" />
        <div className="film-shadow" />
        <div className="film film-final" data-film="clean">
          {/* eslint-disable-next-line @next/next/no-img-element -- the film's no-JS poster, replaced by its canvas at the same pixel box */}
          <img className="film-poster" src="/landing/final/film-clean-d.webp" alt="" width={760} height={540} loading="lazy" />
          <canvas className="film-canvas" />
          <div className="final-print">
            <p className="final-check lead-letters">{t.check}</p>
            <p className="final-count">{t.count}</p>
          </div>
        </div>
        <div className="final-dim" />
        <div className="clips clips-final">
          <span className="clip" />
          <span className="clip" />
        </div>
      </div>
      <div className="houselights" aria-hidden="true" />
      <div className="house-in" aria-hidden="true" />
      <div className="final-copy wrap">
        <h2 id="final-title" className="h2 h2-xl">
          {t.title}
        </h2>
        <p className="final-reading">
          <span className="tag">{t.run}</span> <span>{t.reading}</span>
        </p>
        <div className="actions actions-center">
          <Link className="btn btn-ink" href={demoHref} prefetch={false}>
            {t.demo}
          </Link>
          <a className="btn btn-ghost" href={links.github}>
            {t.github}
          </a>
        </div>
        <p className="note center">
          <code>npm run seed:demo</code> <span>{t.note}</span>
        </p>
      </div>
    </section>
  );
}
