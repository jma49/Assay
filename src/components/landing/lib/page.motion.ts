/**
 * Page-wide motion, mounted on the .lt root:
 *  - the nav takes the ground under its bar (data-theme from the [data-ground] under a line ~120 px down)
 *  - the nav link of the section in the middle of the screen gets aria-current
 *  - in-page anchors scroll to their target and correct once late layout (pins, sticky stories) has settled
 *  - tablet and phone: the nav's CTA steps back while the hero's own CTAs ([data-lt-hero-ctas]) are on screen
 *  - without scroll timelines (Firefox), seams and house lights get their opacities from a passive scroll handler
 */
import type { MotionModule } from "./motion";
import { flags } from "./runtime";

const navGround = (root: HTMLElement, signal: AbortSignal) => {
  const nav = root.querySelector<HTMLElement>(".nav");
  if (!nav) return () => {};
  const grounds = [...root.querySelectorAll<HTMLElement>("main [data-ground], .lt > footer[data-ground]")];
  let io: IntersectionObserver | null = null;
  const watch = () => {
    io?.disconnect();
    // the ground just under the bar, so a section whose top sits under the nav already gives the bar its theme
    const y = Math.min(Math.round(innerHeight * 0.4), 120);
    io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) nav.dataset.theme = (entry.target as HTMLElement).dataset.ground;
        }),
      { rootMargin: `-${y}px 0px -${innerHeight - y - 1}px 0px` },
    );
    grounds.forEach((ground) => io!.observe(ground));
  };
  watch();
  let timer = 0;
  addEventListener(
    "resize",
    () => {
      clearTimeout(timer);
      timer = window.setTimeout(watch, 200);
    },
    { signal },
  );

  const links = [...nav.querySelectorAll<HTMLAnchorElement>(".nav-links a[href^='#']")];
  const byId = new Map(links.map((a) => [a.getAttribute("href")!.slice(1), a]));
  const sections = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        const a = byId.get(entry.target.id);
        if (!a || !entry.isIntersecting) return;
        links.forEach((link) => link.removeAttribute("aria-current"));
        a.setAttribute("aria-current", "true");
      }),
    { rootMargin: "-45% 0px -54% 0px" },
  );
  byId.forEach((_a, id) => {
    const section = document.getElementById(id);
    if (section) sections.observe(section);
  });
  return () => {
    io?.disconnect();
    sections.disconnect();
    clearTimeout(timer);
  };
};

/** Pins and late layout move section tops after load: one scroll, then a correction until the target sits under the nav. */
const anchors = (root: HTMLElement, reduced: boolean, remount: boolean, signal: AbortSignal) => {
  const html = document.documentElement;
  const pad = () => parseFloat(getComputedStyle(html).scrollPaddingTop) || 0;
  const topOf = (el: Element) => Math.max(0, Math.round(el.getBoundingClientRect().top + scrollY - pad()));
  const timers = new Set<number>();
  const later = (fn: () => void, ms: number) => timers.add(window.setTimeout(fn, ms));
  let token = 0;
  const go = (el: HTMLElement, smooth: boolean) => {
    const mine = ++token;
    window.scrollTo({ top: topOf(el), behavior: smooth ? "smooth" : "instant" });
    let tries = 0;
    const settle = () => {
      if (mine !== token) return;
      const off = el.getBoundingClientRect().top - pad();
      if (Math.abs(off) > 6 && tries++ < 5) {
        window.scrollTo({ top: topOf(el), behavior: "instant" });
        later(settle, 120);
      }
    };
    if (smooth && "onscrollend" in window) addEventListener("scrollend", () => later(settle, 60), { once: true, signal });
    else later(settle, smooth ? 900 : 80);
    later(settle, 1600);
  };
  const byHash = (hash: string) => (hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null);
  root.addEventListener(
    "click",
    (event) => {
      const a = (event.target as Element).closest?.<HTMLAnchorElement>('a[href^="#"]');
      if (!a || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const id = a.getAttribute("href")!.slice(1);
      const el = id ? document.getElementById(decodeURIComponent(id)) : null;
      if (!el) return;
      event.preventDefault();
      if (location.hash !== `#${id}`) history.pushState(history.state, "", `#${id}`);
      go(el, !reduced);
      if (id === "main" || a.classList.contains("skip")) {
        el.setAttribute("tabindex", "-1");
        el.focus({ preventScroll: true });
      }
    },
    { signal },
  );
  addEventListener(
    "popstate",
    () => {
      const el = byHash(location.hash);
      if (el) go(el, false);
    },
    { signal },
  );
  // a remount (language switch) leaves the reader where they are
  const target = remount ? null : byHash(location.hash);
  if (target) {
    const when = () => {
      if (signal.aborted) return;
      if (flags.has("intro")) later(when, 100);
      else requestAnimationFrame(() => requestAnimationFrame(() => !signal.aborted && go(target, false)));
    };
    later(when, 300);
  }
  return () => {
    token++;
    timers.forEach(clearTimeout);
  };
};

const heroCtas = (root: HTMLElement) => {
  const ctas = root.querySelector("[data-lt-hero-ctas]");
  if (!ctas) return () => {};
  const io = new IntersectionObserver((entries) => entries.forEach((entry) => flags.set("hero-cta-in", entry.isIntersecting)), { rootMargin: "-60px 0px 0px 0px" });
  io.observe(ctas);
  return () => {
    io.disconnect();
    flags.set("hero-cta-in", false);
  };
};

/** Seams and house lights without scroll timelines: the CSS path's opacities over the same ranges. */
const lightingFallback = (root: HTMLElement, reduced: boolean, signal: AbortSignal) => {
  if (reduced || !window.CSS?.supports || CSS.supports("animation-timeline: view()")) return () => {};
  flags.set("sda-js", true);
  const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const seams = [...root.querySelectorAll<HTMLElement>("main .seam")].map((el) => ({ el, section: el, house: false, inverse: false }));
  const houses = [...root.querySelectorAll<HTMLElement>(".lt-house > .houselights, .lt-house > .house-in")].map((el) => ({
    el,
    section: el.closest("section") ?? el,
    house: true,
    inverse: el.classList.contains("house-in"),
  }));
  const items = [...seams, ...houses];
  const last = new Map<HTMLElement, number>();
  let queued = false;
  const update = () => {
    queued = false;
    const vh = innerHeight;
    for (const item of items) {
      let o: number;
      if (!item.house) {
        const r = item.el.getBoundingClientRect();
        if (!r.height) continue;
        const t = (vh - r.top) / (vh + r.height) / 0.8;
        o = t <= 0.52 ? 1 : 1 - clamp((t - 0.52) / 0.48);
      } else {
        const r = item.section.getBoundingClientRect();
        o = clamp((vh - r.top) / Math.min(vh, r.height) / 0.6);
        if (item.inverse) o = 1 - o;
      }
      o = Math.round(o * 1000) / 1000;
      if (last.get(item.el) !== o) {
        last.set(item.el, o);
        item.el.style.opacity = String(o);
      }
    }
  };
  const queue = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  };
  addEventListener("scroll", queue, { passive: true, signal });
  addEventListener("resize", queue, { passive: true, signal });
  queue();
  return () => {
    flags.set("sda-js", false);
    items.forEach((item) => item.el.style.removeProperty("opacity"));
  };
};

const mount: MotionModule = (root, ctx) => {
  const stops = [navGround(root, ctx.signal), anchors(root, ctx.reduced, ctx.remount, ctx.signal), heroCtas(root), lightingFallback(root, ctx.reduced, ctx.signal)];
  return () => stops.forEach((stop) => stop());
};
export default mount;
