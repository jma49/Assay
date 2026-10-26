/**
 * FAQ: each hanger tab opens its film. A closed answer is hidden="until-found", so find-in-page still reaches it and
 * opens it. Nothing animates height: a hanger swings on its rail (a damped pendulum, rotate only), the film drops into
 * its clips (transform and opacity). When the rack first comes into view the hangers sway to rest, as if just hung.
 * Reduced motion: no swing, no sway. Without JS every film hangs.
 */
import type { MotionModule } from "../../lib/motion";
import { EASE } from "../../lib/runtime";

interface Hanger extends HTMLElement {
  swinging?: Animation | null;
}

const mount: MotionModule = (root, ctx) => {
  const motion = !ctx.reduced;
  const hangers = [...root.querySelectorAll<Hanger>(".hg")];
  const rack = root.querySelector<HTMLElement>(".rack");
  if (!rack || !hangers.length) return;
  // one column on phones and tablets: hang only the first film there
  const single = matchMedia("(max-width: 900px)").matches;
  const bodyOf = (hg: Hanger) => hg.querySelector<HTMLElement>(".hg-body") ?? hg;
  const running = new Set<Animation>();
  let alive = true;

  /** a damped pendulum about the hook: a(t) = A·e^(−t/τ)·cos(2πt/T), sampled into keyframes */
  function swing(hg: Hanger, A: number, { period = 0.62, decay = 0.36, duration = 1500, delay = 0, drop = 0 } = {}) {
    if (!motion) return;
    hg.swinging?.cancel();
    const n = 36;
    const frames: Keyframe[] = [];
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * (duration / 1000);
      const env = Math.exp(-t / decay);
      const a = i === n ? 0 : A * env * Math.cos((2 * Math.PI * t) / period);
      const y = i === n ? 0 : drop * Math.exp(-t / (decay * 0.5));
      frames.push({ transform: `translateY(${y.toFixed(2)}px) rotate(${a.toFixed(3)}deg)` });
    }
    const animation = bodyOf(hg).animate(frames, { duration, delay, easing: "linear", fill: "backwards" });
    hg.swinging = animation;
    running.add(animation);
    animation.onfinish = () => {
      hg.swinging = null;
      running.delete(animation);
    };
  }

  function set(hg: Hanger, open: boolean, animate: boolean) {
    const tab = hg.querySelector<HTMLButtonElement>(".hg-tab")!;
    const panel = hg.querySelector<HTMLElement>(".hg-a")!;
    const film = hg.querySelector<HTMLElement>(".hg-film");
    tab.setAttribute("aria-expanded", String(open));
    if (open) {
      panel.removeAttribute("hidden");
      hg.classList.add("is-open");
      if (animate && motion) {
        hg.classList.remove("is-hanging");
        void hg.offsetWidth;
        hg.classList.add("is-hanging");
        // the weight of the film sets the hanger swinging
        swing(hg, 2.6, { period: 0.7, decay: 0.42, duration: 1700 });
      }
      return;
    }
    const close = () => {
      if (tab.getAttribute("aria-expanded") !== "false") return;
      hg.classList.remove("is-open", "is-hanging");
      panel.setAttribute("hidden", "until-found");
      // the empty hanger rocks back a little
      if (animate) swing(hg, -1.4, { period: 0.5, decay: 0.28, duration: 1000 });
    };
    if (animate && motion && film) {
      // lift the film off its clips, then take it down
      const lift = film.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-8px)" }], { duration: 160, easing: EASE.glide });
      running.add(lift);
      lift.onfinish = () => {
        running.delete(lift);
        close();
      };
    } else close();
  }

  // the first mount hangs the defaults; a remount after a language switch keeps what the reader opened
  const opened = (ctx.memo.opened as boolean[] | undefined) ?? hangers.map((hg, i) => hg.classList.contains("is-open") && (!single || i === 0));
  hangers.forEach((hg, i) => {
    set(hg, opened[i] === true, false);
    const tab = hg.querySelector<HTMLButtonElement>(".hg-tab")!;
    tab.addEventListener(
      "click",
      () => {
        const open = tab.getAttribute("aria-expanded") !== "true";
        opened[i] = open;
        set(hg, open, true);
      },
      { signal: ctx.signal },
    );
    hg.querySelector(".hg-a")!.addEventListener(
      "beforematch",
      () => {
        opened[i] = true;
        set(hg, true, false);
      },
      { signal: ctx.signal },
    );
  });
  ctx.memo.opened = opened;

  /* a fine pointer brushing past a hanger nudges it on its rail (never while it is swinging) */
  if (motion && ctx.finePointer) {
    hangers.forEach((hg) =>
      hg.querySelector(".hg-tab")!.addEventListener(
        "pointerenter",
        (event) => {
          if (hg.swinging) return;
          const r = (event.currentTarget as HTMLElement).getBoundingClientRect();
          swing(hg, (event as PointerEvent).clientX < r.left + r.width / 2 ? -0.7 : 0.7, { period: 0.6, decay: 0.3, duration: 900 });
        },
        { signal: ctx.signal },
      ),
    );
  }

  const cleanup = () => {
    alive = false;
    running.forEach((animation) => animation.cancel());
    hangers.forEach((hg) => {
      hg.swinging = null;
      hg.classList.remove("is-hanging");
      bodyOf(hg).style.removeProperty("transform");
    });
  };

  /* entrance: only when motion is allowed and the rack starts below the fold, so nothing jumps in view */
  if (!motion || ctx.memo.swayed || rack.getBoundingClientRect().top < innerHeight * 0.9) return cleanup;
  // pose every hanger before it is seen (rotation only: text stays where it is and opaque)
  const amp = (i: number) => (i % 2 ? 1 : -1) * (4.2 - (i % 4) * 0.5);
  hangers.forEach((hg, i) => (bodyOf(hg).style.transform = `translateY(-10px) rotate(${amp(i)}deg)`));
  // the hangers get their layers a screen ahead, in an idle moment, not on the first frame of the drop
  const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1));
  const pre = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      pre.disconnect();
      idle(() => alive && hangers.forEach((hg) => (bodyOf(hg).style.willChange = "transform")));
    },
    { rootMargin: "0px 0px 100% 0px" },
  );
  pre.observe(rack);
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      io.disconnect();
      ctx.memo.swayed = true;
      hangers.forEach((hg, i) => {
        const column = hg.parentElement === rack.lastElementChild && !single ? 1 : 0;
        const k = single ? i : hangers.filter((h) => h.parentElement === hg.parentElement).indexOf(hg);
        bodyOf(hg).style.transform = "";
        swing(hg, amp(i), { period: 0.74, decay: 0.5, duration: 2000, delay: k * 90 + column * 140, drop: -10 });
      });
      // the layers stay: demoting seven hangers when the sway ends repainted the rack in one 110 ms frame in WebKit
    },
    { rootMargin: "0px 0px -8% 0px" },
  );
  io.observe(rack);
  return () => {
    pre.disconnect();
    io.disconnect();
    cleanup();
  };
};
export default mount;
