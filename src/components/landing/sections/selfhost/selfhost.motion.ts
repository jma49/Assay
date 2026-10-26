/**
 * Self-host: the plate turns square to the raking light as the section scrolls in (scrubbed), then engraves itself
 * row by row: the baked engraved plate revealed strip by strip over the blank one (windows wiped open by transforms),
 * the live VERSION and APP values cut with their rows; the quick-start slip is laid on it. Copy stamps the slip.
 * Only transform and opacity animate. Reduced motion, a section already in view, a remount after the cut: settled.
 */
import { need } from "../../lib/gsap";
import type { MotionModule } from "../../lib/motion";
import { EASE } from "../../lib/runtime";
import { GEO } from "./plate-geo";

interface Strip {
  mover: HTMLElement;
  img: HTMLElement;
  vertical?: boolean;
}

const mount: MotionModule = (root, ctx) => {
  const memo = ctx.memo as { done?: boolean };
  const slip = root.querySelector<HTMLElement>(".sh-slip")!;
  const stamp = root.querySelector<HTMLElement>(".sh-stamp")!;
  const btn = root.querySelector<HTMLElement>(".sh-copy")!;
  const undo: (() => void)[] = [];
  const cleanup = () => undo.splice(0).reverse().forEach((fn) => fn());

  /* ---------- Copy stamps the slip: the button gives, the stamp lands hard, the film takes the knock ---------- */
  const stamps = new Set<Animation>();
  slip.addEventListener(
    "sh:copied",
    () => {
      if (ctx.reduced) return;
      stamps.forEach((a) => a.cancel());
      stamps.clear();
      stamps.add(btn.animate([{ transform: "scale(1)" }, { transform: "scale(.92)", offset: 0.35 }, { transform: "scale(1)" }], { duration: 260, easing: EASE.snap }));
      stamps.add(
        stamp.animate(
          [
            { opacity: 0, transform: "rotate(-11deg) scale(1.9)" },
            { opacity: 1, transform: "rotate(-5deg) scale(.94)", offset: 0.07, easing: EASE.snap },
            { opacity: 1, transform: "rotate(-5deg) scale(1)", offset: 0.14 },
            { opacity: 1, transform: "rotate(-5deg) scale(1)", offset: 0.86 },
            { opacity: 0, transform: "rotate(-5deg) scale(1)" },
          ],
          { duration: 2600, easing: "cubic-bezier(.55,0,1,.45)" },
        ),
      );
      stamps.add(slip.animate([{ transform: "translateY(0)" }, { transform: "translateY(2px)", offset: 0.4 }, { transform: "translateY(0)" }], { duration: 220, delay: 120, easing: "ease-out" }));
    },
    { signal: ctx.signal },
  );
  undo.push(() => stamps.forEach((a) => a.cancel()));

  /* ---------- the entrance: only when motion is allowed and the section starts below the fold ---------- */
  const settle = () => root.classList.add("is-settled");
  undo.push(() => root.classList.remove("is-pending", "is-engraving", "is-settled"));
  if (ctx.reduced || memo.done || root.getBoundingClientRect().top < innerHeight * 0.9) {
    settle();
    return cleanup;
  }
  root.classList.add("is-pending");

  const phone = matchMedia("(max-width: 959px)");
  const body = root.querySelector<HTMLElement>(".sh-plate-body")!;
  const dim = root.querySelector<HTMLElement>(".sh-plate-dim")!;
  const dimSweep = dim.querySelector<HTMLElement>("i")!;
  const shadow = root.querySelector<HTMLElement>(".sh-plate-shadow")!;
  const stage = root.querySelector<HTMLElement>(".sh-stage")!;
  const dense = devicePixelRatio > 1.25;
  const plateUrl = (kind: string) =>
    phone.matches ? `/landing/selfhost/plate-p-${kind}.webp` : `/landing/selfhost/plate-d-${kind}${dense ? "" : "-1x"}.webp`;

  // the blank plate under a stack of strips, each a window onto the engraved bake, wiped open by moving the window one
  // way and its picture the other (transform only, composited)
  function buildEngraving() {
    const g = GEO[phone.matches ? "p" : "d"];
    const wrap = document.createElement("div");
    wrap.className = "sh-engrave";
    wrap.setAttribute("aria-hidden", "true");
    const base = document.createElement("img");
    base.className = "sh-eng-blank";
    base.alt = "";
    base.src = plateUrl("blank");
    base.decoding = "async";
    wrap.appendChild(base);
    const pct = (v: number, of: number) => `${(v / of) * 100}%`;
    const engraved = plateUrl(ctx.lang);
    const images: HTMLImageElement[] = [base];
    const strip = (x: number, y: number, w: number, h: number, vertical = false): Strip => {
      const win = document.createElement("span");
      win.className = "sh-eng-win";
      win.style.cssText = `left:${pct(x, g.w)};top:${pct(y, g.h)};width:${pct(w, g.w)};height:${pct(h, g.h)}`;
      const img = document.createElement("img");
      img.alt = "";
      img.src = engraved;
      img.decoding = "async";
      img.style.cssText = `width:${(g.w / w) * 100}%;height:${(g.h / h) * 100}%;left:${(-x / w) * 100}%;top:${(-y / h) * 100}%`;
      if (images.length < 2) images.push(img);
      const mover = document.createElement("span");
      mover.className = "sh-eng-mv";
      const counter = document.createElement("span");
      counter.className = "sh-eng-mv";
      counter.appendChild(img);
      mover.appendChild(counter);
      win.appendChild(mover);
      wrap.appendChild(win);
      return { mover, img: counter, vertical };
    };
    // the border's four sides, the rules, then the rows
    const [bx0, by0, bx1, by1] = g.border;
    const hb = g.bw / 2;
    const border = [
      strip(bx0 - hb, by0 - hb, bx1 - bx0 + g.bw, g.bw),
      strip(bx1 - hb, by0 - hb, g.bw, by1 - by0 + g.bw, true),
      strip(bx0 - hb, by1 - hb, bx1 - bx0 + g.bw, g.bw),
      strip(bx0 - hb, by0 - hb, g.bw, by1 - by0 + g.bw, true),
    ];
    const rules = g.rules.map((y) => strip(g.x0 + 4, y - g.rw / 2, g.x1 - g.x0 - 8, g.rw));
    const rows = g.rows.map(([y, h]) => strip(g.x0, y - h / 2, g.x1 - g.x0, h));
    // the live values (rendered by React) are cut with their rows
    const layer = root.querySelector(phone.matches ? ".sh-live-p" : ".sh-live-d");
    const live = [...(layer?.querySelectorAll<HTMLElement>(".sh-live-row") ?? [])].map((win) => {
      const [mover, img] = win.querySelectorAll<HTMLElement>(".sh-eng-mv");
      return { row: Number(win.dataset.row), strip: { mover: mover!, img: img! } };
    });
    return { wrap, border, rules, rows, live, images };
  }

  let started = false;
  let stop: (() => void) | null = null;
  undo.push(() => stop?.());
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting) || started) return;
      started = true;
      io.disconnect();
      need("ScrollTrigger")
        .then(({ gsap }) => {
          if (ctx.signal.aborted) return;
          stop = entrance(gsap);
        })
        .catch(settle);
    },
    { rootMargin: "0px 0px 120% 0px" },
  );
  io.observe(root);
  undo.push(() => io.disconnect());

  // no ScrollTrigger.refresh() here: nothing above moves (the engraving is absolute, the rest is transforms), the new
  // trigger measures itself, and a refresh re-measures the whole page in one frame (80 ms in WebKit on a phone)
  function entrance(gsap: typeof import("gsap").gsap) {
    const parts = buildEngraving();
    const all = [...parts.border, ...parts.rules, ...parts.rows, ...parts.live.map((l) => l.strip)];
    const axis = (s: Strip) => (s.vertical ? "yPercent" : "xPercent");
    const close = (s: Strip) => {
      gsap.set(s.mover, { [axis(s)]: -100 });
      gsap.set(s.img, { [axis(s)]: 100 });
    };
    // in the plate (hidden) before GSAP sets the strips closed: GSAP measures a detached element by attaching it to
    // <html>, a full layout per strip that froze WebKit for ~3 s
    parts.wrap.style.visibility = "hidden";
    body.insertBefore(parts.wrap, body.querySelector(".sh-live"));
    let engraved = false;
    let finished = false;
    let cut: gsap.core.Timeline | null = null;
    let turn: gsap.core.Timeline | null = null;
    let lift: Animation | null = null;

    // the strips are set closed a few at a time in idle moments (the section is still a screen away), then the turn
    // arms: one frame of all of it cost 60 ms in WebKit on a phone
    const closing = [...parts.border, ...parts.rules, ...parts.rows];
    const idle =
      window.requestIdleCallback ??
      ((cb: IdleRequestCallback) => {
        const t0 = performance.now();
        return window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => Math.max(0, 8 - (performance.now() - t0)) }), 16);
      });
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
    let idleId = 0;
    const closeSome: IdleRequestCallback = (deadline) => {
      let n = 0;
      while (closing.length && (n++ < 6 || deadline.timeRemaining() > 3)) close(closing.shift()!);
      if (closing.length) idleId = idle(closeSome, { timeout: 120 });
      else arm();
    };
    idleId = idle(closeSome, { timeout: 120 });

    function arm() {
      if (ctx.signal.aborted) return;
      void Promise.all(parts.images.map((img) => img.decode().catch(() => {}))).then(() => {
        if (finished || ctx.signal.aborted) return;
        parts.wrap.style.removeProperty("visibility");
        parts.live.forEach((l) => close(l.strip));
        root.classList.add("is-engraving");
      });

      // the plate turns square to the light as the stage scrolls in (scrubbed, reversible); the engraving starts while
      // it is still turning, so a reader who stops at the headline never faces a blank plate
      const small = phone.matches;
      turn = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: stage, start: "top 96%", end: small ? "top 52%" : "top 55%", scrub: 0.9, onUpdate: (st) => st.progress > 0.6 && engrave() },
      });
      // x and y explicit: otherwise GSAP decomposes the pending 3D transform into a stray x/y offset
      turn
        .fromTo(body, { rotationY: small ? -16 : -34, rotationX: small ? 8 : 12, z: -60, x: 0, y: 0 }, { rotationY: 0, rotationX: 0, z: 0, x: 0, y: 0 }, 0)
        .fromTo(dimSweep, { x: 0, xPercent: -60 }, { x: 0, xPercent: 0 }, 0)
        .fromTo(dim, { opacity: 1 }, { opacity: 0, ease: "power2.in" }, 0)
        .fromTo(
          shadow,
          { rotationY: small ? -16 : -34, rotationX: small ? 8 : 12, x: small ? 16 : 34, y: small ? 18 : 28, opacity: 0.3 },
          { rotationY: 0, rotationX: 0, x: 0, y: 0, opacity: 1 },
          0,
        );
      gsap.set(slip, { y: -18, scale: 1.035 });
      slip.classList.add("is-lifted");
      root.classList.remove("is-pending");

      function engrave() {
        if (engraved) return;
        engraved = memo.done = true;
        const wipe = (tl: gsap.core.Timeline, s: Strip, at: number, dur: number, ease: string) => {
          const a = axis(s);
          tl.fromTo(s.mover, { [a]: -100 }, { [a]: 0, duration: dur, ease }, at).fromTo(s.img, { [a]: 100 }, { [a]: 0, duration: dur, ease }, at);
        };
        // the strips stay when the cut is done: they are the engraved plate (swapping back to the picture made WebKit
        // decode and repaint the whole 2x plate in one frame)
        cut = gsap.timeline({
          onComplete: () => {
            finished = true;
            settle();
          },
        });
        // the scribe lays out the border and the rules, then each row is cut left to right
        parts.border.forEach((s, i) => wipe(cut!, s, i * 0.22, 0.34, "power1.inOut"));
        parts.rules.forEach((s, i) => wipe(cut!, s, 0.12 + i * 0.05, 0.42, "power2.inOut"));
        parts.rows.forEach((s, i) => wipe(cut!, s, 0.42 + i * 0.12, 0.46, "power1.inOut"));
        parts.live.forEach((l) => wipe(cut!, l.strip, 0.42 + l.row * 0.12, 0.46, "power1.inOut"));
        cut.fromTo(slip, { y: -18, scale: 1.035 }, { y: 0, scale: 1, duration: 0.9, ease: "settle", clearProps: "transform" }, "-=0.5").add(() => {
          slip.classList.remove("is-lifted");
          lift = slip.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 900, easing: EASE.settle, pseudoElement: "::after" });
        }, "<");
      }
      // crossing the phone/desktop breakpoint mid-entrance: drop the live engraving, show the plate
      phone.addEventListener(
        "change",
        () => {
          if (finished) return;
          finished = engraved = true;
          cut?.progress(1);
          gsap.set(all.flatMap((s) => [s.mover, s.img]), { clearProps: "transform" });
          parts.wrap.remove();
          root.classList.remove("is-engraving");
          settle();
        },
        { signal: ctx.signal },
      );
    }

    return () => {
      cancelIdle(idleId);
      turn?.scrollTrigger?.kill();
      turn?.kill();
      cut?.kill();
      lift?.cancel();
      parts.wrap.remove();
      gsap.set([body, dim, dimSweep, shadow, slip, ...all.flatMap((s) => [s.mover, s.img])], { clearProps: "transform,opacity" });
      slip.classList.remove("is-lifted");
    };
  }

  return cleanup;
};
export default mount;
