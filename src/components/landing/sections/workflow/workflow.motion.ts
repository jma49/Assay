/**
 * Workflow: a strip of three frames on the light box.
 * Desktop with motion: the strip arrives threaded, frame 1 in the viewer gate; each frame plays in the gate (lead
 * markers set down letter by letter, the triage typed, the MCP result streamed), is held a moment, then the strip is
 * pulled one frame on: the rollers turn as far as the film travels, the counter ticks. After frame 3 the gate opens
 * into the three-up contact sheet. Below 1240 px: a snap strip; each frame develops and plays when swiped into view.
 * Only transform and opacity animate. Reduced motion and no JS: the settled layout, all three frames side by side.
 */
import type { MotionModule } from "../../lib/motion";
import { EASE, observe, relayout } from "../../lib/runtime";
import { PLAYS, STOP, type Stage } from "./plays";
import { rollerFrames } from "./strip";

type State = "veiled" | "ready" | "playing" | "done";
const PULL = [0.62, 0, 0.22, 1] as const;
const HOLD = [700, 350];

const mount: MotionModule = (root, ctx) => {
  const viewport = root.querySelector<HTMLElement>("[data-wf-viewport]");
  const strip = root.querySelector<HTMLElement>(".wf-strip");
  const reel = root.querySelector<HTMLElement>(".wf-reel");
  const cells = [...root.querySelectorAll<HTMLElement>("[data-wf-frame]")];
  if (!viewport || !strip || !reel || cells.length !== 3) return;
  const desk = matchMedia("(min-width: 1240px)");
  const motion = !ctx.reduced;
  const memo = ctx.memo as { started?: boolean; opened?: boolean; on?: boolean; g?: number };
  let opened = memo.opened === true && motion;
  const gated = () => motion && desk.matches && !opened;
  const undo: (() => void)[] = [];
  const signal = ctx.signal;

  /* ---------- controls for the snap strip (also under reduced motion) ---------- */
  const nums = [...root.querySelectorAll<HTMLButtonElement>(".wf-num")];
  const prev = root.querySelector<HTMLButtonElement>('[data-wf-go="prev"]')!;
  const next = root.querySelector<HTMLButtonElement>('[data-wf-go="next"]')!;
  let current = 1;
  function setCurrent(n: number) {
    current = n;
    nums.forEach((b) => b.setAttribute("aria-current", String(Number(b.dataset.wfGo) === n)));
    cells.forEach((c, i) => c.classList.toggle("is-cur", i === n - 1));
    prev.disabled = n === 1;
    next.disabled = n === cells.length;
  }
  function go(n: number) {
    const cell = cells[Math.max(0, Math.min(cells.length - 1, n - 1))]!;
    viewport!.scrollTo({ left: cell.offsetLeft - (viewport!.clientWidth - cell.offsetWidth) / 2, behavior: motion ? "smooth" : "auto" });
  }
  root.querySelectorAll<HTMLButtonElement>("[data-wf-go]").forEach((b) =>
    b.addEventListener(
      "click",
      () => {
        const v = b.dataset.wfGo;
        go(v === "prev" ? current - 1 : v === "next" ? current + 1 : Number(v));
      },
      { signal },
    ),
  );
  setCurrent(1);
  // the strip is a keyboard-scrollable region only where it actually scrolls (the snap strip)
  const focusable = () => (gated() ? viewport.removeAttribute("tabindex") : viewport.setAttribute("tabindex", "0"));
  focusable();
  desk.addEventListener("change", focusable, { signal });
  const curIo = new IntersectionObserver(
    (es) => es.forEach((e) => e.isIntersecting && !gated() && setCurrent(Number((e.target as HTMLElement).dataset.wfFrame))),
    { root: viewport, threshold: 0.6 },
  );
  cells.forEach((c) => curIo.observe(c));
  undo.push(() => {
    curIo.disconnect();
    nums.forEach((b, i) => (i ? b.removeAttribute("aria-current") : b.setAttribute("aria-current", "true")));
    cells.forEach((c) => c.classList.remove("is-cur"));
    prev.disabled = next.disabled = false;
    viewport.setAttribute("tabindex", "0");
  });
  const cleanup = () => undo.splice(0).reverse().forEach((fn) => fn());
  if (!motion) return cleanup;

  /* ---------- registry: everything this module animates, splits or marks is undone at cleanup ---------- */
  const running = new Set<Animation>();
  const timers = new Set<number>();
  const splits = new Map<HTMLElement, Node[]>();
  const A = (el: Element, frames: Keyframe[], opts: KeyframeAnimationOptions) => {
    const a = el.animate(frames, opts);
    running.add(a);
    a.addEventListener("finish", () => opts.fill !== "both" && opts.fill !== "forwards" && opts.fill !== "backwards" && running.delete(a));
    return a;
  };
  const later = (fn: () => void, ms: number) => {
    const t = window.setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
  };
  undo.push(() => {
    // a run in flight sees the abort when its cancelled animations resolve, and stops there
    timers.forEach(clearTimeout);
    timers.clear();
    running.forEach((a) => a.cancel());
    running.clear();
    splits.forEach((nodes, el) => el.replaceChildren(...nodes));
    splits.clear();
    root.classList.remove("wf-armed", "wf-desk", "wf-on", "wf-open");
    root.style.removeProperty("--wf-film-h");
    root.querySelectorAll(".on, .typing, .gone, .churn").forEach((el) => el.classList.remove("on", "typing", "gone", "churn"));
    cells.forEach((c) => c.classList.remove("lit", "dev", "in-gate"));
    [strip, reel, viewport, ...root.querySelectorAll<HTMLElement>(".wf-roller > span")].forEach((el) => el.style.removeProperty("transform"));
  });

  root.classList.add("wf-armed");
  root.classList.toggle("wf-desk", desk.matches && !opened);
  if (opened) root.classList.add("wf-open");
  const film = cells[0]!.querySelector<HTMLElement>(".wf-film")!;
  const setFilmH = () => root.style.setProperty("--wf-film-h", `${film.offsetHeight}px`);
  setFilmH();
  // the film row can grow once the fonts arrive; the lower rollers follow it
  const ro = new ResizeObserver(setFilmH);
  ro.observe(film);
  undo.push(() => ro.disconnect());

  /* ---------- the box switches on as the section arrives (fluorescent start) ---------- */
  const dim = root.querySelector<HTMLElement>(".wf-dim")!;
  const switchOn = () => {
    memo.on = true;
    const a = A(
      dim,
      [
        { opacity: 0.74 },
        { opacity: 0.74, offset: 0.12 },
        { opacity: 0.18, offset: 0.17 },
        { opacity: 0.62, offset: 0.24 },
        { opacity: 0.08, offset: 0.31 },
        { opacity: 0.36, offset: 0.38 },
        { opacity: 0.04, offset: 0.6 },
        { opacity: 0 },
      ],
      { duration: 1150, easing: "linear" },
    );
    a.finished.then(() => root.classList.add("wf-on")).catch(() => {});
  };
  // already lit (a remount), or the reader is already on the section: no flicker in view
  if (memo.on || root.getBoundingClientRect().top < innerHeight * 0.82) {
    memo.on = true;
    root.classList.add("wf-on");
  } else undo.push(observe(root, switchOn, { once: true, rootMargin: "0px 0px -18% 0px" }));

  /* ---------- per-frame state and helpers ---------- */
  const state = new Map<HTMLElement, State>(cells.map((c) => [c, "veiled"]));
  const anims = new Map<HTMLElement, Animation[]>(cells.map((c) => [c, []]));
  const anim = (cell: HTMLElement, el: Element, frames: Keyframe[], opts: KeyframeAnimationOptions) => {
    const a = A(el, frames, { fill: "both", ...opts });
    anims.get(cell)!.push(a);
    return a;
  };
  // a pause inside a frame's play; rejects with STOP if the frame was settled meanwhile
  const step = (cell: HTMLElement, ms: number) =>
    new Promise<void>((resolve, reject) => later(() => (state.get(cell) === "playing" ? resolve() : reject(STOP)), ms));
  const pause = (ms: number) => new Promise<void>((resolve) => later(resolve, ms));
  const on = (el: Element | null) => el?.classList.add("on");
  let seed = 7;
  const stage: Stage = {
    lang: ctx.lang,
    anim,
    step,
    on,
    split,
    random: () => (seed = (seed * 16807) % 2147483647) / 2147483647,
  };

  // the text of a node as one span per character; the original nodes come back at finish and at cleanup
  function split(el: HTMLElement) {
    if (!splits.has(el)) splits.set(el, [...el.childNodes]);
    const parts = [...(el.textContent ?? "")];
    el.replaceChildren();
    return parts.map((p) => {
      const s = document.createElement("span");
      s.className = "ch";
      s.textContent = p;
      el.append(s);
      return s;
    });
  }
  function unsplit(el: Element) {
    const nodes = splits.get(el as HTMLElement);
    if (!nodes) return;
    (el as HTMLElement).replaceChildren(...nodes);
    splits.delete(el as HTMLElement);
  }
  // snap strip: the slit of light crosses the frame; the print behind it comes up a touch over-bright, then settles
  function develop(cell: HTMLElement, ms: number) {
    cell.classList.add("lit");
    const veil = cell.querySelector(".wf-veil")!;
    const flash = cell.querySelector(".wf-flash")!;
    anim(cell, flash, [{ opacity: 0 }, { opacity: 0.13, offset: 0.45 }, { opacity: 0 }], { duration: ms * 1.5, delay: ms * 0.35, easing: "ease-out", fill: "none" });
    const a = anim(cell, veil, [{ transform: "translateX(0)" }, { transform: "translateX(101%)" }], { duration: ms, easing: EASE.develop });
    return a.finished.then(() => cell.classList.add("dev")).catch(() => {});
  }
  function finish(cell: HTMLElement) {
    if (state.get(cell) === "done") return;
    state.set(cell, "done");
    anims.get(cell)!.forEach((a) => {
      a.cancel();
      running.delete(a);
    });
    anims.get(cell)!.length = 0;
    cell.classList.add("lit", "dev");
    cell.querySelectorAll("[data-b], [data-type], [data-mark], .wf-ul").forEach(on);
    cell.querySelectorAll(".typing").forEach((el) => el.classList.remove("typing"));
    // the letters split for the play become the rendered text again, so they read as words
    cell.querySelectorAll("[data-type], [data-mark]").forEach(unsplit);
    cell.querySelector(".wf-btn")?.classList.add("gone");
  }
  async function playFrame(cell: HTMLElement) {
    if (signal.aborted) return;
    try {
      await PLAYS[cell.dataset.wfFrame!]!(cell, stage);
    } catch (e) {
      if (e !== STOP) throw e;
    }
    if (!signal.aborted) finish(cell);
  }
  async function play(cell: HTMLElement) {
    if (state.get(cell) === "done" || state.get(cell) === "playing") return;
    state.set(cell, "playing");
    await playFrame(cell);
  }
  async function developAndPlay(cell: HTMLElement) {
    if (state.get(cell) !== "veiled") return;
    state.set(cell, "playing");
    await develop(cell, 820);
    if (signal.aborted) return;
    if (state.get(cell) !== "playing") return finish(cell);
    await playFrame(cell);
  }
  // desktop: every frame is printed from the start (no veils); only its beats wait
  function ready(cell: HTMLElement) {
    if (state.get(cell) !== "veiled") return;
    state.set(cell, "ready");
    cell.classList.add("lit", "dev");
  }

  /* ---------- desktop: the viewer gate ---------- */
  const rollers = [...root.querySelectorAll<HTMLElement>(".wf-roller > span")];
  const pbtns = [...root.querySelectorAll<HTMLButtonElement>("[data-wf-step]")];
  let g = memo.g ?? 1;
  let token = 0;
  let runActive = false;
  let started = memo.started === true;
  const phase = { value: 0 };
  const pitch = () => cells[0]!.getBoundingClientRect().width;
  const offset = (n: number) => (2 - n) * pitch();
  function gateMarks(n: number) {
    cells.forEach((c, i) => c.classList.toggle("in-gate", i === n - 1));
    pbtns[0]!.disabled = n === 1;
    pbtns[1]!.disabled = n === cells.length;
  }
  function place(n: number) {
    g = memo.g = n;
    strip!.style.transform = gated() ? `translateX(${offset(n)}px)` : "";
    reel!.style.transform = `translateY(${-(n - 1) * 18}px)`;
    gateMarks(n);
  }
  undo.push(() => pbtns.forEach((b) => (b.disabled = false)));
  // one pull: the strip travels to frame n, the rollers turn with it, the counter ticks as the frame arrives
  function pull(n: number, ms: number) {
    const from = offset(g);
    const to = offset(n);
    const all: Animation[] = [];
    all.push(
      A(
        strip!,
        [
          { transform: `translateX(${from}px) translateY(0)`, easing: `cubic-bezier(${PULL.join(",")})` },
          { transform: `translateX(${to}px) translateY(1.5px)`, offset: 0.9, easing: "ease-out" },
          { transform: `translateX(${to}px) translateY(0)` },
        ],
        { duration: ms * 1.1 },
      ),
    );
    const kf = rollerFrames(to - from, ms, PULL, phase);
    rollers.forEach((r) => {
      r.style.transform = String(kf[kf.length - 1]!.transform);
      all.push(A(r, kf, { duration: ms }));
    });
    const r0 = -(g - 1) * 18;
    const r1 = -(n - 1) * 18;
    all.push(A(reel!, [{ transform: `translateY(${r0}px)` }, { transform: `translateY(${r1}px)` }], { duration: Math.min(320, ms * 0.5), delay: ms * 0.6, easing: EASE.snap, fill: "backwards" }));
    later(() => gateMarks(n), ms * 0.45);
    // as the frame seats in the aperture the lamp catches it: a brief over-bright, then the print settles
    A(cells[n - 1]!.querySelector(".wf-flash")!, [{ opacity: 0 }, { opacity: 0.12, offset: 0.3 }, { opacity: 0 }], { duration: 520, delay: ms * 0.8, easing: "ease-out" });
    place(n);
    // the outgoing frame leaves the light at once; the incoming one is lit as it reaches the aperture
    cells.forEach((c) => c.classList.remove("in-gate"));
    return Promise.all(all.map((a) => a.finished)).catch(() => {});
  }

  // the run: each frame plays in the gate, is held, and the strip is pulled on (about 8 s in all)
  async function run() {
    if (runActive || started) return;
    runActive = true;
    started = memo.started = true;
    const my = ++token;
    for (let n = 1; n <= cells.length; n++) {
      if (n > 1) {
        await pull(n, 660);
        if (my !== token || signal.aborted) return;
      }
      await play(cells[n - 1]!);
      if (my !== token || signal.aborted) return;
      if (n < cells.length) {
        await pause(HOLD[n - 1]!);
        if (my !== token || signal.aborted) return;
      }
    }
    runActive = false;
    // frame 3 is held, then the gate opens: the strip is laid out as a contact sheet, all three frames legible
    await pause(1500);
    if (my === token && !signal.aborted) openGate(true);
  }
  function settleAll() {
    token++;
    runActive = false;
    started = memo.started = true;
    timers.forEach(clearTimeout);
    timers.clear();
    cells.forEach(finish);
    [strip!, reel!, ...rollers].forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
    if (gated()) place(cells.length);
    else {
      strip!.style.transform = "";
      cells.forEach((c) => c.classList.remove("in-gate"));
    }
  }
  // the outgoing strip leaves the light (opacity and a small drop), then the three frames are set down side by side,
  // left to right (transform and opacity only; the layout switch happens unseen)
  // The contact sheet is taller than the gated strip: it opens only while the next section's heading is below the fold,
  // so the growth moves nothing the reader is reading, only the empty ground above that heading (otherwise frame 3
  // stays in the gate, as when the reader moves on).
  const nextHead = root.nextElementSibling?.querySelector("h2");
  const growsUnseen = () => (nextHead ?? root).getBoundingClientRect()[nextHead ? "top" : "bottom"] > innerHeight;
  function openGate(animated: boolean) {
    if (opened || !gated() || (animated && !growsUnseen())) return;
    const out = [viewport!, root.querySelector<HTMLElement>(".wf-plate")!];
    const lay = () => {
      opened = memo.opened = true;
      settleAll();
      strip!.style.transform = "";
      cells.forEach((c) => c.classList.remove("in-gate"));
      root.classList.remove("wf-desk", "wf-armed");
      root.classList.add("wf-open");
      focusable();
    };
    if (!animated) return lay();
    const fades = out.map((el) => A(el, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(10px)" }], { duration: 240, easing: EASE.glide, fill: "forwards" }));
    void Promise.all(fades.map((a) => a.finished))
      .catch(() => {})
      .then(() => {
        if (signal.aborted) return;
        if (!growsUnseen()) return fades.forEach((a) => a.cancel());
        lay();
        // the section grew: the triggers below it measure again, in the frame where nothing visible moves
        relayout();
        fades.forEach((a) => a.cancel());
        // the film's leaders change place with the layout: they come back with the sheet (unseen while they move, so
        // the switch is no layout shift)
        root.querySelectorAll(".wf-leader").forEach((leader) =>
          A(leader, [{ opacity: 0 }, { opacity: 1 }], { duration: 420, delay: 60 + cells.length * 110, easing: EASE.settle, fill: "backwards" }),
        );
        cells.forEach((c, i) =>
          A(c, [{ opacity: 0, transform: "translateY(22px)" }, { opacity: 1, transform: "none", offset: 0.35 }, { opacity: 1, transform: "none" }], {
            duration: 760,
            delay: 60 + i * 110,
            easing: EASE.settle,
            fill: "backwards",
          }),
        );
      });
  }
  // the plate's buttons take over: whatever is playing settles, the film is pulled, the new frame plays once
  async function stepTo(delta: number) {
    if (!gated()) return;
    const n = Math.max(1, Math.min(cells.length, g + delta));
    if (n === g) return;
    token++;
    runActive = false;
    started = memo.started = true;
    cells.forEach((c) => state.get(c) === "playing" && finish(c));
    const my = token;
    await pull(n, 620);
    if (my === token && !signal.aborted) void play(cells[n - 1]!);
  }
  pbtns.forEach((b) => b.addEventListener("click", () => void stepTo(Number(b.dataset.wfStep)), { signal }));

  /* ---------- below 1240: each frame develops and plays when it is swiped into view ---------- */
  let queue = Promise.resolve();
  const seen = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (gated()) return;
        const cell = (e.target as HTMLElement).closest<HTMLElement>("[data-wf-frame]")!;
        const read =
          e.intersectionRatio >= 0.75 || (e.isIntersecting && e.intersectionRect.height >= innerHeight * 0.6 && e.intersectionRect.width >= e.boundingClientRect.width * 0.6);
        if (read && state.get(cell) === "veiled") queue = queue.then(() => (signal.aborted ? undefined : developAndPlay(cell)));
      }),
    { threshold: [0, 0.25, 0.5, 0.6, 0.75, 0.9] },
  );
  cells.forEach((c) => seen.observe(c.querySelector(".wf-film")!));
  undo.push(() => seen.disconnect());

  /* ---------- desktop triggers ---------- */
  if (gated()) {
    cells.forEach(ready);
    // a remount after the run had started shows the run settled (frame 3 in the gate); nothing replays
    if (started) settleAll();
    else place(g);
  } else if (opened || (ctx.remount && started)) cells.forEach(finish);
  // starts once the whole film row is on screen; once a quarter of it has scrolled off the top, the reader has moved
  // on and everything settles. Observed on the viewport, which never moves sideways (the strip does).
  const start = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (!gated()) return;
        const top = e.boundingClientRect.top;
        const fh = film.offsetHeight;
        const shown = Math.max(0, Math.min(innerHeight, top + fh) - Math.max(0, top));
        if (e.isIntersecting && top < -0.25 * fh) {
          if (cells.some((c) => state.get(c) !== "done")) settleAll();
          return;
        }
        if (shown >= 0.97 * Math.min(fh, innerHeight - 100) && !started) void run();
      }),
    { threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
  );
  start.observe(viewport);
  // leaving the section settles everything, so nothing plays off screen
  const away = new IntersectionObserver((es) =>
    es.forEach((e) => {
      if (!e.isIntersecting && cells.some((c) => state.get(c) === "playing" || (gated() && started && state.get(c) !== "done"))) settleAll();
    }),
  );
  away.observe(root);
  // the fog churns only while the broken frame is on screen
  const fog = root.querySelector(".wf-fog")!;
  const fogIo = new IntersectionObserver((es) => es.forEach((e) => fog.classList.toggle("churn", e.isIntersecting)));
  fogIo.observe(fog);
  undo.push(() => {
    start.disconnect();
    away.disconnect();
    fogIo.disconnect();
  });
  desk.addEventListener(
    "change",
    () => {
      if (opened) return;
      root.classList.toggle("wf-desk", desk.matches);
      settleAll();
      if (!desk.matches) setCurrent(current);
    },
    { signal },
  );
  addEventListener("resize", () => gated() && !strip.getAnimations().length && place(g), { passive: true, signal });

  return cleanup;
};
export default mount;
