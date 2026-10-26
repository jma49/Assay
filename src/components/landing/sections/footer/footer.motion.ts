/** The sign-off etching draws itself once, when it is still below the fold at mount (DrawSVG). */
import { need } from "../../lib/gsap";
import type { MotionModule } from "../../lib/motion";
import { observe } from "../../lib/runtime";

const mount: MotionModule = async (root, ctx) => {
  const etch = root.querySelector<SVGSVGElement>(".etch");
  if (!etch || ctx.reduced || ctx.memo.drawn || etch.getBoundingClientRect().top <= innerHeight) return;
  const { gsap } = await need("DrawSVGPlugin");
  if (ctx.signal.aborted) return;
  const q = (selector: string) => [...etch.querySelectorAll(selector)];
  const box = q(".etch-box > *");
  const film = q(".etch-film > *");
  const clips = q(".etch-clips > *");
  const wall = q(".etch-wall > *");
  const lit = q(".etch-lit > *");
  const all = [...box, ...film, ...clips, ...wall, ...lit];
  gsap.set(all, { drawSVG: "0%" });
  let tl: gsap.core.Timeline | null = null;
  const stop = observe(
    etch,
    () => {
      ctx.memo.drawn = true;
      tl = gsap
        .timeline()
        .to(box, { drawSVG: "100%", duration: 1.1, ease: "develop", stagger: 0.12 }, 0)
        .to(film, { drawSVG: "100%", duration: 1.0, ease: "develop", stagger: 0.1 }, 0.7)
        .to(clips, { drawSVG: "100%", duration: 0.5, ease: "settle", stagger: 0.1 }, 1.5)
        .to(wall, { drawSVG: "100%", duration: 1.2, ease: "glide", stagger: 0.15 }, 1.2)
        .to(lit, { drawSVG: "100%", duration: 0.45, ease: "settle", stagger: 0.05 }, 2.1);
    },
    { once: true, threshold: 0.35 },
  );
  return () => {
    stop();
    tl?.kill();
    gsap.set(all, { clearProps: "strokeDasharray,strokeDashoffset" });
  };
};
export default mount;
