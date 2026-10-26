/**
 * The live hero light box (desktop push-in only; imported by gl.ts, which decides when). The scroll push-in becomes a
 * real camera move (gl-rig.ts): the camera swings round the box on its way in and squares up on the film. Nothing here
 * can differ from the poster at rest: the wall, the housing and the lit face are the bake itself (gl-build.ts), so the
 * first live frame is the poster and the hand-off cannot be seen.
 * Creates the WebGL context only in a quiet moment, renders only while the scroll position (or the eye) changes and
 * never off-screen, and falls back to the poster and the CSS push on a lost context or a frame rate that does not hold.
 */
import type { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import { need } from "../../lib/gsap";
import { flags, hero as heroState } from "../../lib/runtime";
import { isDesk, untilDesk } from "./gl";
import { buildScene } from "./gl-build";
import { createRig } from "./gl-rig";

const aborted = () => new DOMException("aborted", "AbortError");
const idle = () =>
  new Promise<void>((r) => {
    const s = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
    if (s?.yield) void s.yield().then(r);
    else setTimeout(r, 0);
  });

/** Creating the WebGL context costs one main-thread task: never inside the intro or a scroll (a fling). */
function quietMoment(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    let lastScroll = 0;
    const onScroll = () => (lastScroll = performance.now());
    addEventListener("scroll", onScroll, { passive: true, signal });
    const check = () => {
      if (signal.aborted) return reject(aborted());
      // the caption beat: warm up then
      const late = heroState.timeline && heroState.timeline.time() > 2.5;
      if ((flags.has("intro") && !late) || performance.now() - lastScroll < 60) return void setTimeout(check, 80);
      removeEventListener("scroll", onScroll);
      (window.requestIdleCallback ?? ((f: () => void) => setTimeout(f, 50)))(() => resolve(), { timeout: 800 });
    };
    check();
  });
}

/** Builds the scene and takes over once it renders; resolves with a dispose function. Rejects when aborted. */
export async function runScene(hero: HTMLElement, signal: AbortSignal): Promise<() => void> {
  const mount = hero.querySelector<HTMLElement>('.hero-gl[data-art="hero-gl"]');
  const img = mount?.querySelector<HTMLImageElement>("img.hero-bake");
  const film = hero.querySelector<HTMLElement>(".film-hero");
  const stage = hero.querySelector<HTMLElement>(".hero-stage");
  const pin = hero.querySelector<HTMLElement>(".hero-pin");
  if (!mount || !img || !film || !stage || !pin) throw new Error("no hero");
  const dom = { stage, pin, film, clipsBox: hero.querySelector<HTMLElement>(".clips-hero"), clipEls: [...hero.querySelectorAll<HTMLElement>(".clips-hero .clip")] };
  const check = () => {
    if (signal.aborted) throw aborted();
  };

  await quietMoment(signal);
  // decoded off the main thread (the poster is already in the cache)
  const bitmap = await createImageBitmap(await (await fetch(img.currentSrc || img.src, { signal })).blob());
  if (signal.aborted) {
    bitmap.close();
    throw aborted();
  }
  await untilDesk(signal);
  check();
  await quietMoment(signal);

  const canvas = document.createElement("canvas");
  canvas.className = "hero-gl-canvas";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.opacity = "0";
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  } catch {
    bitmap.close();
    throw new Error("no WebGL");
  }
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(new THREE.Color().setRGB(62 / 255, 53 / 255, 47 / 255, THREE.SRGBColorSpace), 1);
  const ac = new AbortController();
  const off = ac.signal;
  let built: ReturnType<typeof buildScene> | null = null;
  let rig: ReturnType<typeof createRig> | null = null;
  const release = () => {
    ac.abort();
    canvas.remove();
    rig?.clearOverlay();
    flags.set("gl-hero", false);
    built?.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    bitmap.close();
  };
  try {
    await idle();
    check();
    const b = (built = buildScene(bitmap, renderer.capabilities.getMaxAnisotropy()));
    const r = (rig = createRig(b, dom, renderer));
    await idle();
    check();

    /* ---------- render on demand ---------- */
    const state = { p: 0 };
    let mix = 1; // the swing's share during a mid-push takeover (0: the CSS push's camera, 1: the camera's path)
    let mixT0 = 0;
    let raf = 0;
    let visible = true;
    let shown = false;
    let live = true;
    let frames: number[] = [];
    let last = 0;
    let scrollTween: gsap.core.Tween | null = null;
    let st: ScrollTrigger | null = null;
    let io: IntersectionObserver | null = null;
    const request = () => {
      if (!raf && visible && live) raf = requestAnimationFrame(frame);
    };
    function frame(now: number) {
      raf = 0;
      if (!live) return;
      const glOn = flags.has("gl-hero");
      if (mixT0) {
        mix = Math.min(1, (now - mixT0) / 420);
        if (mix >= 1) mixT0 = 0;
        else request();
      }
      const eyeMoving = glOn && r.stepPointer(now, state.p);
      // before the takeover the canvas is hidden and the CSS push moves the DOM: draw, but leave the DOM alone
      r.apply(state.p, glOn, mix);
      renderer.render(b.scene, b.camera);
      if (scrollTween?.isActive()) {
        if (last) frames.push(now - last);
        last = now;
        if (frames.length >= 40) checkPace();
        request();
      } else last = 0;
      if (eyeMoving) request();
      if (!shown) tryShow();
    }
    function stop() {
      live = false;
      io?.disconnect();
      st?.kill();
      scrollTween?.kill();
      cancelAnimationFrame(raf);
      visible = false;
    }
    function fallback() {
      stop();
      flags.set("gl-hero", false);
      canvas.remove();
      r.clearOverlay();
    }
    // if the scene cannot hold its frame rate while scrolling, hand back to the poster and the CSS push
    function checkPace() {
      const sorted = frames.slice().sort((x, y) => x - y);
      frames = [];
      if (sorted[sorted.length >> 1]! > 26) fallback();
    }
    // the live layer takes over only where both paths show the same picture: at rest, or once the hero has left; mid
    // push-in it starts on the CSS push's own camera, fades in over it, then blends the swing in over 420 ms (not
    // during the lift)
    function tryShow() {
      if (shown) return;
      const mid = !(state.p <= 0.0005 || state.p >= 0.9995);
      if (mid && state.p > 0.5) return;
      shown = true;
      if (mid) mix = 0;
      requestAnimationFrame(() => {
        const a = canvas.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: "linear", fill: "forwards" });
        a.finished
          .then(() => {
            canvas.style.opacity = "1";
            a.cancel();
            if (!live) return;
            flags.set("gl-hero", true);
            if (mix < 1) mixT0 = performance.now();
            request();
          })
          .catch(() => {});
      });
    }

    r.measure();
    await idle();
    check();
    renderer.initTexture(b.tex);
    await idle();
    check();
    try {
      await renderer.compileAsync(b.scene, b.camera);
    } catch {
      // compiled on the first render instead
    }
    await idle();
    check();
    mount.appendChild(canvas);

    // the eye follows a fine pointer
    const fine = matchMedia("(hover: hover) and (pointer: fine)");
    addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType !== "mouse" || !fine.matches) return;
        r.ptr.tx = Math.max(-1, Math.min(1, (e.clientX / innerWidth) * 2 - 1));
        r.ptr.ty = Math.max(-1, Math.min(1, (e.clientY / innerHeight) * 2 - 1));
        request();
      },
      { passive: true, signal: off },
    );
    document.documentElement.addEventListener(
      "mouseleave",
      () => {
        r.ptr.tx = r.ptr.ty = 0;
        request();
      },
      { signal: off },
    );
    canvas.addEventListener(
      "webglcontextlost",
      (e) => {
        e.preventDefault();
        fallback();
      },
      { signal: off },
    );
    io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          visible = e.isIntersecting;
          if (visible) request();
        }),
      { rootMargin: "80px" },
    );
    io.observe(hero);

    // scroll: the hero's pinned range drives the camera, with a short physical lag
    const { gsap, ScrollTrigger: ST } = await need("ScrollTrigger");
    check();
    const proxy = { p: 0 };
    st = ST.create({
      trigger: hero,
      start: "top top",
      end: "bottom bottom",
      onUpdate(self) {
        if (!isDesk()) return;
        // before the takeover the CSS push is on screen: follow the scroll exactly, so the takeover lands on it
        if (!flags.has("gl-hero")) {
          proxy.p = state.p = self.progress;
          return request();
        }
        scrollTween = gsap.to(proxy, {
          p: self.progress,
          duration: 0.35,
          ease: "power2.out",
          overwrite: true,
          onUpdate() {
            state.p = proxy.p;
            request();
          },
        });
        request();
      },
      onRefresh(self) {
        proxy.p = state.p = self.progress;
        request();
      },
    });
    proxy.p = state.p = st.progress;
    request();

    // tablet and phone keep the poster: sleep below the desktop width, wake above it
    let rt = 0;
    addEventListener(
      "resize",
      () => {
        clearTimeout(rt);
        rt = window.setTimeout(() => {
          if (!live) return;
          if (!isDesk()) {
            flags.set("gl-hero", false);
            canvas.style.opacity = "0";
            shown = false;
            return r.clearOverlay();
          }
          r.measure();
          request();
        }, 160);
      },
      { signal: off },
    );

    return () => {
      clearTimeout(rt);
      stop();
      release();
    };
  } catch (error) {
    release();
    throw error;
  }
}
