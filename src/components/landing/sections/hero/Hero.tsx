import "./hero.css";
import Link from "next/link";
import { useLanding } from "../../lib/context";
import { useCopy } from "../../lib/i18n";
import { useMotion } from "../../lib/motion";
import { heroCopy } from "./copy";
import type { HeroData } from "./hero.motion";

/**
 * The hero, room ground: the light box switches on, the film of demo.orders develops, the returned rows light
 * (hero.motion.ts). The markup alone is the settled hero: the baked room and the film's poster.
 */
export function Hero() {
  const { demo, demoHref, session, links } = useLanding();
  const t = useCopy(heroCopy);
  const ref = useMotion<HTMLElement, HeroData>(() => import("./hero.motion"), { idle: t.idle });
  return (
    <section ref={ref} className="hero" id="top" data-ground="room" aria-labelledby="hero-title">
      <div className="hero-pin">
        <div className="hero-stage" aria-hidden="true" data-lt-art="">
          <div className="hero-cam">
            {/* the live art mount: hero-gl-scene.ts puts its three.js canvas here; the bake is the poster and the fallback */}
            <div className="hero-gl" data-art="hero-gl">
              <picture>
                <source media="(max-width: 700px)" srcSet="/landing/hero/hero-p.jpg" />
                <img className="hero-bake" src="/landing/hero/hero-d.jpg" alt="" width={1440} height={900} fetchPriority="high" />
              </picture>
            </div>
            <div className="cam-face" />
            <div className="film film-hero" data-film="orders">
              <picture>
                <source media="(max-width: 700px)" srcSet="/landing/hero/film-orders-p.webp" />
                <img className="film-poster" src="/landing/hero/film-orders-d.webp" alt="" width={1234} height={896} />
              </picture>
              <canvas className="film-canvas" />
              <canvas className="film-glow" />
              <canvas className="film-flare" />
              <canvas className="film-live" />
              <div className="film-bands" />
              <div className="film-proof">
                <div className="reader">
                  <span className="reader-line" />
                  <span className="reader-tag" />
                </div>
              </div>
            </div>
            <div className="clips clips-hero">
              <span className="clip" />
              <span className="clip" />
            </div>
            <div className="dimmer" />
            <canvas className="tube-light" />
          </div>
        </div>

        <div className="hero-copy wrap">
          <h1 id="hero-title" className="display">
            {t.lines.map((line, i) => (
              <span key={i} className="line">
                <span>{line}</span>
              </span>
            ))}
          </h1>
          <p className="lede">{t.lede}</p>
          <div className="actions" data-lt-hero-ctas="">
            <Link className="btn btn-ink" href={demoHref} prefetch={false}>
              {t.demo}
            </Link>
            <a className="btn btn-ghost" href={links.github}>
              {t.github}
            </a>
          </div>
          <p className="note" data-session={session}>
            {demo ? t.guestNote : t.signInNote}
          </p>
        </div>

        <div className="hero-reading">
          <p className="reading">
            <span className="tag">{t.run}</span> <span className="reading-text">{t.reading}</span>
          </p>
          <button className="replay" type="button" data-replay="">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3.2 8a4.8 4.8 0 1 0 1.5-3.5M3 2.6v2.6h2.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{t.replay}</span>
          </button>
        </div>
        <div className="hero-face" aria-hidden="true" />
      </div>
      <div className="hero-rise" aria-hidden="true" />
    </section>
  );
}
